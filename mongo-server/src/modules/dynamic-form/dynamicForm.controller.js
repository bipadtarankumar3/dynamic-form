// mongo-server/src/modules/dynamic-form/dynamicForm.controller.js
// Core dynamic form engine — handles add, edit, list, details, view, schema-details, master-details
const Form = require("../../models/Form.model");
const FormData = require("../../models/FormData.model");
const MasterSchema = require("../../models/MasterSchema.model");
const MasterData = require("../../models/MasterData.model");
const User = require("../../models/User.model");
const Role = require("../../models/Role.model");
const AuditLog = require("../../models/AuditLog.model");
const DatabaseView = require("../../models/DatabaseView.model");
const mongoose = require("mongoose");

// ---- Helpers ----

function getFormSchema(form_slug) {
  return Form.findOne({ slug: form_slug, deleted_at: null });
}

// Resolve master dropdown options by field config
async function resolveMasterOptions(field) {
  if (!field.master_slug) return [];
  const masterData = await MasterData.find({ master_slug: field.master_slug, deleted_at: null, is_active: true }).lean();
  const masterSchema = await MasterSchema.findOne({ slug: field.master_slug, deleted_at: null }).lean();
  const labelField = masterSchema?.label_field || "name";
  return masterData.map(d => ({ value: d._id.toString(), label: d.data?.[labelField] || d.data?.name || String(d._id) }));
}

// Extract and flatten form fields from section payloads or root payload
function extractFormData(form, reqBody, files = []) {
  const resultData = {};
  const rootPK = form.root_entity?.primary_key || "id";
  const internalKeys = new Set([
    "form_slug",
    "form_id",
    "record_id",
    "id",
    "_id",
    rootPK,
    "status",
    "parent_id",
    "parent_primary_key_value",
    "parent_primary_key",
    "children_slug",
    "undefined",
    "extra__",
  ]);

  // 1. Process sections defined in form schema
  for (const section of form.sections || []) {
    const secKey = section.section_id || section.id || section.slug;
    const secData =
      reqBody[secKey] ||
      (section.section_id && reqBody[section.section_id]) ||
      (section.id && reqBody[section.id]) ||
      (section.slug && reqBody[section.slug]);

    if (section.type === "general" && secData && typeof secData === "object" && !Array.isArray(secData)) {
      for (const [k, v] of Object.entries(secData)) {
        if (!internalKeys.has(k)) {
          resultData[k] = v;
        }
      }
    } else if (section.type === "add_more" && secData) {
      const addMoreKey = section.slug || section.section_id || section.id;
      if (Array.isArray(secData)) {
        resultData[addMoreKey] = secData;
      } else if (typeof secData === "object") {
        resultData[addMoreKey] = Object.values(secData);
      }
    }
  }

  // 2. Also check if fields were passed flat in reqBody
  for (const [k, v] of Object.entries(reqBody)) {
    if (internalKeys.has(k)) continue;
    const isSectionContainer = (form.sections || []).some(
      (s) => s.section_id === k || s.id === k || s.slug === k
    );
    if (!isSectionContainer && k !== "undefined") {
      resultData[k] = v;
    }
  }

  // 3. If there is an "undefined" key in reqBody (from unkeyed sections), extract its fields if missing
  if (reqBody["undefined"] && typeof reqBody["undefined"] === "object" && !Array.isArray(reqBody["undefined"])) {
    for (const [k, v] of Object.entries(reqBody["undefined"])) {
      if (!internalKeys.has(k) && resultData[k] === undefined) {
        resultData[k] = v;
      }
    }
  }

  // 4. Attach any uploaded files
  if (files && Array.isArray(files)) {
    files.forEach((file) => {
      const match = file.fieldname.match(/\[([^\]]+)\]$/);
      const fieldKey = match ? match[1] : file.fieldname;
      resultData[fieldKey] = file.filename || file.originalname;
    });
  }

  return resultData;
}

// Clean and normalize existing record data from any legacy nested section keys
function cleanRecordData(rawData) {
  const data = { ...(rawData || {}) };
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === "object" && !Array.isArray(v) && (k.startsWith("sec_") || k === "undefined")) {
      for (const [subK, subV] of Object.entries(v)) {
        if (subV !== undefined && subV !== null && subV !== "") {
          data[subK] = subV;
        }
      }
      delete data[k];
    }
  }
  delete data["undefined"];
  return data;
}

const dynamicFormController = {

  // ================================================================
  // SCHEMA DETAILS — return form definition for client renderer
  // ================================================================
  schemaDetails: async (req, res) => {
    try {
      const { form_slug } = req.body;
      if (!form_slug) return res.status(400).json({ success: false, message: "form_slug is required" });

      const form = await getFormSchema(form_slug);
      if (!form) return res.status(404).json({ success: false, message: `Form schema "${form_slug}" not found` });

      return res.json({ success: true, data: form });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // ================================================================
  // MASTER DETAILS — return master dropdown options for a given master_slug, view, table, or form
  // ================================================================
  masterDetails: async (req, res) => {
    try {
      const {
        master,
        master_slug,
        master_name,
        table_name,
        name,
        slug,
        filters = {},
        search,
        page = 1,
        limit = 500,
        label_key,
        primary_key,
      } = req.body;

      const masterKey = (master || master_slug || master_name || table_name || name || slug || "").trim();
      if (!masterKey) {
        return res.status(400).json({ success: false, message: "master identifier is required" });
      }

      const db = mongoose.connection.db;

      // Normalize candidate names: e.g. "v_state", "state", "t_state", "t_frm_state"
      const cleanSlug = masterKey.replace(/^v_/, "").replace(/^t_frm_/, "").replace(/^t_/, "");
      const candidates = Array.from(new Set([
        masterKey,
        `v_${cleanSlug}`,
        cleanSlug,
        `t_frm_${cleanSlug}`,
        `t_${cleanSlug}`,
      ]));

      // 1. Check if a MongoDB collection or view directly exists for any candidate (e.g. "v_state")
      let matchedCollection = null;
      for (const cand of candidates) {
        const exists = await db.listCollections({ name: cand }).toArray();
        if (exists.length > 0) {
          matchedCollection = cand;
          break;
        }
      }

      if (matchedCollection) {
        const query = {};
        if (search) {
          query.$or = [
            { state_name: { $regex: search, $options: "i" } },
            { name: { $regex: search, $options: "i" } },
            { title: { $regex: search, $options: "i" } },
            { label: { $regex: search, $options: "i" } },
          ];
        }
        if (filters && typeof filters === "object") {
          for (const [k, v] of Object.entries(filters)) {
            if (v !== undefined && v !== null && v !== "") {
              query[k] = v;
            }
          }
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [records, total] = await Promise.all([
          db.collection(matchedCollection).find(query).skip(skip).limit(Number(limit)).toArray(),
          db.collection(matchedCollection).countDocuments(query),
        ]);

        const data = records.map((r) => {
          const val = r.id || r._id || r.value;
          let lbl = r[label_key] || r.label;
          if (!lbl) {
            const keyCandidates = [
              label_key,
              "name",
              "title",
              `${cleanSlug}_name`,
              "state_name",
              "display_name",
              "label",
              "code",
            ].filter(Boolean);
            for (const k of keyCandidates) {
              if (r[k] !== undefined && r[k] !== null) {
                lbl = r[k];
                break;
              }
            }
          }
          if (!lbl) {
            const foundKey = Object.keys(r).find(
              (k) =>
                !["_id", "id", "status", "created_by", "updated_by", "created_at", "updated_at", "__v"].includes(k) &&
                (k.endsWith("_name") || k.includes("name") || k.endsWith("_title") || k.includes("title"))
            );
            if (foundKey) lbl = r[foundKey];
          }
          if (!lbl) lbl = String(val);

          return {
            ...r,
            value: String(val),
            label: String(lbl),
            id: String(val),
            _id: r._id ? String(r._id) : String(val),
          };
        });

        return res.json({ success: true, total, data });
      }

      // 2. Check if it corresponds to a Dynamic Form (in Form / FormData collections)
      const form = await Form.findOne({
        $or: [
          { slug: masterKey },
          { slug: cleanSlug },
          { title: new RegExp(`^${cleanSlug}$`, "i") },
        ],
        deleted_at: null,
      }).lean();

      if (form) {
        const query = { form_slug: form.slug, deleted_at: null };
        if (filters && typeof filters === "object") {
          for (const [k, v] of Object.entries(filters)) {
            if (v !== undefined && v !== null && v !== "") {
              query[`data.${k}`] = v;
            }
          }
        }

        let detectedLabelField = label_key;
        if (!detectedLabelField) {
          const cols = (form.table_columns || []).map((c) => c.key);
          detectedLabelField =
            cols.find((c) => c === "name" || c.endsWith("_name") || c.includes("name") || c.endsWith("_title") || c.includes("title")) ||
            "name";
        }

        if (search) {
          query[`data.${detectedLabelField}`] = { $regex: search, $options: "i" };
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [records, total] = await Promise.all([
          FormData.find(query).skip(skip).limit(Number(limit)).lean(),
          FormData.countDocuments(query),
        ]);

        const data = records.map((r) => {
          const recData = r.data || {};
          const val = r._id;
          const lbl =
            recData[label_key] ||
            recData[detectedLabelField] ||
            recData.name ||
            recData[`${form.slug}_name`] ||
            recData.state_name ||
            recData.title ||
            String(val);

          return {
            ...recData,
            value: String(val),
            label: String(lbl),
            id: String(val),
            _id: String(val),
          };
        });

        return res.json({ success: true, total, data });
      }

      // 3. Fallback: Check MasterSchema / MasterData
      const masterSchema = await MasterSchema.findOne({
        $or: [{ slug: masterKey }, { slug: cleanSlug }],
        deleted_at: null,
      }).lean();

      if (masterSchema) {
        const labelField = label_key || masterSchema.label_field || "name";
        const query = { master_slug: masterSchema.slug, deleted_at: null, is_active: true };
        if (search) {
          query[`data.${labelField}`] = { $regex: search, $options: "i" };
        }
        if (filters && typeof filters === "object") {
          for (const [k, v] of Object.entries(filters)) {
            if (v !== undefined && v !== null && v !== "") {
              query[`data.${k}`] = v;
            }
          }
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [records, total] = await Promise.all([
          MasterData.find(query).skip(skip).limit(Number(limit)).lean(),
          MasterData.countDocuments(query),
        ]);

        const data = records.map((r) => ({
          value: r._id.toString(),
          label: r.data?.[labelField] || r.data?.name || String(r._id),
          ...r.data,
          _id: r._id,
        }));

        return res.json({ success: true, total, data });
      }

      return res.status(404).json({ success: false, message: `Master/Table/View "${masterKey}" not found` });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // ================================================================
  // ADD — save a new form record
  // ================================================================
  add: async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const { form_slug, parent_id, parent_primary_key_value, status } = req.body;

      if (!form_slug) return res.status(400).json({ success: false, message: "form_slug is required" });

      const form = await getFormSchema(form_slug);
      if (!form) return res.status(400).json({ success: false, message: "Invalid form schema" });

      const effectiveParentId = parent_id || parent_primary_key_value || null;
      const cleanData = extractFormData(form, req.body, req.files);

      const record = await FormData.create({
        form_slug,
        form_version: form.version || 1,
        parent_id: effectiveParentId,
        status: status || cleanData.status || "draft",
        data: cleanData,
        created_by: userId,
        updated_by: userId,
      });

      await AuditLog.create({ action: "create", module: form_slug, record_id: record._id, user_id: userId, new_data: cleanData });

      return res.status(201).json({ success: true, message: "Record created successfully", data: { id: record._id } });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // ================================================================
  // EDIT — update an existing form record
  // ================================================================
  edit: async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const { form_slug, record_id, id, selected_data, status } = req.body;

      if (!form_slug) return res.status(400).json({ success: false, message: "form_slug is required" });

      const form = await getFormSchema(form_slug);
      if (!form) return res.status(400).json({ success: false, message: "Invalid form schema" });

      const rootPK = form.root_entity?.primary_key || "id";
      const targetId =
        record_id ||
        id ||
        req.body[rootPK] ||
        req.body.id ||
        req.body._id ||
        selected_data?.id ||
        selected_data?._id ||
        selected_data?.[rootPK] ||
        (Object.keys(req.body).find((k) => k.endsWith("_id") && req.body[k])
          ? req.body[Object.keys(req.body).find((k) => k.endsWith("_id") && req.body[k])]
          : null);

      if (!targetId) return res.status(400).json({ success: false, message: "record_id is required" });

      const existing = await FormData.findOne({ _id: targetId, form_slug, deleted_at: null }).lean();
      if (!existing) return res.status(404).json({ success: false, message: "Record not found" });

      const cleanData = extractFormData(form, req.body, req.files);

      // Clean existing data from legacy nested section keys or undefined keys
      const updatedData = cleanRecordData(existing.data);
      for (const s of form.sections || []) {
        if (s.section_id) delete updatedData[s.section_id];
        if (s.id) delete updatedData[s.id];
        if (s.slug) delete updatedData[s.slug];
      }

      Object.assign(updatedData, cleanData);
      const targetStatus = status || cleanData.status || existing.status;

      await FormData.findByIdAndUpdate(targetId, {
        data: updatedData,
        status: targetStatus,
        updated_by: userId,
      });

      await AuditLog.create({ action: "update", module: form_slug, record_id: targetId, user_id: userId, old_data: existing.data, new_data: updatedData });

      return res.json({ success: true, message: "Record updated successfully" });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // ================================================================
  // GENERAL LIST VIEW — paginated list from FormData collection
  // ================================================================
  generalListView: async (req, res) => {
    try {
      const {
        form_slug,
        page,
        limit,
        pageSize,
        search,
        sort_field,
        sort_order,
        filters,
        parent_id,
        parent_primary_key_value,
        pagination,
      } = req.body;

      if (!form_slug) return res.status(400).json({ success: false, message: "form_slug is required" });

      const form = await getFormSchema(form_slug);
      if (!form) return res.status(404).json({ success: false, message: "Form schema not found" });

      const currentPage = Number(page || pagination?.current_page || pagination?.page || 1);
      const limitVal = Number(limit || pageSize || pagination?.page_size || pagination?.limit || 100);
      const skip = (currentPage - 1) * limitVal;

      // Safely parse filters if passed as JSON string or object/array
      let parsedFilters = filters;
      if (typeof parsedFilters === "string") {
        try { parsedFilters = JSON.parse(parsedFilters); } catch (_) { parsedFilters = {}; }
      }
      if (!parsedFilters || typeof parsedFilters !== "object") {
        parsedFilters = {};
      }

      // Extract effective search string
      let effectiveSearch = "";
      if (typeof search === "string" && search.trim()) {
        effectiveSearch = search.trim();
      } else if (!Array.isArray(parsedFilters) && typeof parsedFilters.search === "string" && parsedFilters.search.trim()) {
        effectiveSearch = parsedFilters.search.trim();
      }

      // Build filter query
      const matchQuery = { form_slug, deleted_at: null };

      // Parent ID filter
      const effectiveParentId = parent_id || parent_primary_key_value || (!Array.isArray(parsedFilters) ? parsedFilters.parent_id : undefined);
      if (effectiveParentId) {
        matchQuery.parent_id = effectiveParentId;
      }

      // Search across table_columns or sections fields
      if (effectiveSearch) {
        const searchCols = (form.table_columns && form.table_columns.length > 0)
          ? form.table_columns.filter(c => c.checked !== false && !["id", "_id", "created_at", "updated_at"].includes(c.key))
          : [];
        const searchFields = searchCols.map(c => ({ [`data.${c.key}`]: { $regex: effectiveSearch, $options: "i" } }));
        if (searchFields.length > 0) matchQuery.$or = searchFields;
      }

      // Apply additional filters (support both array format and object format)
      if (Array.isArray(parsedFilters)) {
        for (const f of parsedFilters) {
          if (f && f.field && f.value !== undefined && f.value !== "") {
            const key = (f.field === "status" || f.field === "parent_id") ? f.field : `data.${f.field}`;
            matchQuery[key] = f.operator === "contains"
              ? { $regex: f.value, $options: "i" }
              : f.value;
          }
        }
      } else {
        for (const [k, v] of Object.entries(parsedFilters)) {
          if (k === "search" || k === "parent_id" || k === "form_slug") continue;
          if (v !== null && v !== undefined && v !== "") {
            const key = (k === "status" || k === "parent_id") ? k : `data.${k}`;
            matchQuery[key] = v;
          }
        }
      }

      // Sort
      const sortField = sort_field || req.body.sort?.field || req.body.sort_by;
      const sortOrder = sort_order || req.body.sort?.order || "desc";
      const sortDir = (sortOrder === "desc" || sortOrder === -1 || sortOrder === "DESC") ? -1 : 1;

      const sortObj = {};
      if (sortField) {
        const isRootField = ["created_at", "updated_at", "status", "_id"].includes(sortField);
        sortObj[isRootField ? sortField : `data.${sortField}`] = sortDir;
      } else {
        sortObj.created_at = -1;
      }

      // Query FormData collection directly
      const [records, total] = await Promise.all([
        FormData.find(matchQuery)
          .skip(skip)
          .limit(limitVal)
          .sort(sortObj)
          .populate("created_by", "name email")
          .populate("updated_by", "name email")
          .lean(),
        FormData.countDocuments(matchQuery),
      ]);

      // Flatten data fields for response
      const flattenedRecords = records.map((r) => {
        const idStr = r._id?.toString() || r.id;
        const createdByName = r.created_by?.name || (typeof r.created_by === "string" ? r.created_by : "");
        const updatedByName = r.updated_by?.name || (typeof r.updated_by === "string" ? r.updated_by : "");
        const cleanedData = cleanRecordData(r.data);
        return {
          id: idStr,
          _id: idStr,
          ...cleanedData,
          status: r.status,
          created_at: r.created_at,
          updated_at: r.updated_at,
          created_by: r.created_by?._id?.toString() || r.created_by || null,
          created_by_name: createdByName,
          name_created_by: createdByName,
          updated_by: r.updated_by?._id?.toString() || r.updated_by || null,
          updated_by_name: updatedByName,
          name_updated_by: updatedByName,
        };
      });

      // Ensure table_columns has columns if not specified
      let tableColumns = form.table_columns || [];
      if (tableColumns.length === 0 && form.sections?.length > 0) {
        tableColumns = [];
        form.sections.forEach((sec) => {
          (sec.fields || []).forEach((fld) => {
            const k = fld.db_field || fld.column_name || fld.id;
            if (k && !tableColumns.some((c) => c.key === k)) {
              tableColumns.push({ key: k, label: fld.label || k, type: fld.type || "text", checked: true, sortable: true });
            }
          });
        });
      }

      const formObj = form.toObject ? form.toObject() : form;
      return res.json({
        success: true,
        status: true,
        schema: {
          ...formObj,
          table_columns: tableColumns,
        },
        pagination: {
          current_page: currentPage,
          page: currentPage,
          page_size: limitVal,
          limit: limitVal,
          total,
          pages: Math.ceil(total / limitVal) || 1,
        },
        total,
        page: currentPage,
        pageSize: limitVal,
        data: flattenedRecords,
        rows: flattenedRecords,
      });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // ================================================================
  // DETAILS — load single record for editing
  // ================================================================
  details: async (req, res) => {
    try {
      const { form_slug, record_id, id, selected_data } = req.body;
      if (!form_slug) return res.status(400).json({ success: false, message: "form_slug is required" });

      const form = await getFormSchema(form_slug);
      if (!form) return res.status(404).json({ success: false, message: "Form schema not found" });

      const rootPK = form.root_entity?.primary_key || "id";
      const targetId =
        record_id ||
        id ||
        selected_data?.id ||
        selected_data?._id ||
        selected_data?.[rootPK] ||
        (selected_data && typeof selected_data === "object"
          ? selected_data[Object.keys(selected_data).find((k) => k.endsWith("_id"))]
          : null);

      if (!targetId) return res.status(400).json({ success: false, message: "form_slug and record_id are required" });

      const record = await FormData.findOne({ _id: targetId, form_slug, deleted_at: null }).lean();
      if (!record) return res.status(404).json({ success: false, message: "Record not found" });

      const idStr = record._id.toString();
      const cleanedData = cleanRecordData(record.data);
      const responseData = {
        id: idStr,
        _id: idStr,
        ...cleanedData,
        status: record.status,
        created_at: record.created_at,
        updated_at: record.updated_at,
      };
      if (rootPK && rootPK !== "id") {
        responseData[rootPK] = idStr;
      }

      return res.json({
        success: true,
        status: true,
        schema: form,
        data: responseData,
      });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // ================================================================
  // VIEW — load single record for view-only (read mode)
  // ================================================================
  viewById: async (req, res) => {
    try {
      const { form_slug, record_id, id, selected_data } = req.body;
      if (!form_slug) return res.status(400).json({ success: false, message: "form_slug is required" });

      const form = await getFormSchema(form_slug);
      if (!form) return res.status(404).json({ success: false, message: "Form schema not found" });

      const rootPK = form.root_entity?.primary_key || "id";
      const targetId =
        record_id ||
        id ||
        selected_data?.id ||
        selected_data?._id ||
        selected_data?.[rootPK] ||
        (selected_data && typeof selected_data === "object"
          ? selected_data[Object.keys(selected_data).find((k) => k.endsWith("_id"))]
          : null);

      if (!targetId) return res.status(400).json({ success: false, message: "form_slug and record_id are required" });

      const record = await FormData.findOne({ _id: targetId, form_slug, deleted_at: null })
        .populate("created_by", "name email")
        .populate("updated_by", "name email")
        .lean();
      if (!record) return res.status(404).json({ success: false, message: "Record not found" });

      const idStr = record._id.toString();
      const createdByName = record.created_by?.name || (typeof record.created_by === "string" ? record.created_by : "");
      const updatedByName = record.updated_by?.name || (typeof record.updated_by === "string" ? record.updated_by : "");
      const cleanedData = cleanRecordData(record.data);

      const responseData = {
        id: idStr,
        _id: idStr,
        ...cleanedData,
        status: record.status,
        created_at: record.created_at,
        updated_at: record.updated_at,
        created_by: record.created_by?._id?.toString() || record.created_by || null,
        created_by_name: createdByName,
        name_created_by: createdByName,
        updated_by: record.updated_by?._id?.toString() || record.updated_by || null,
        updated_by_name: updatedByName,
      };
      if (rootPK && rootPK !== "id") {
        responseData[rootPK] = idStr;
      }

      return res.json({
        success: true,
        status: true,
        schema: form,
        data: responseData,
      });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // ================================================================
  // ACTIVE / INACTIVE — toggle record status
  // ================================================================
  activeInactive: async (req, res) => {
    try {
      const { form_slug, record_id, id, selected_data, is_active } = req.body;
      const targetId = record_id || id || selected_data?.id || selected_data?._id;
      if (!form_slug || !targetId) return res.status(400).json({ success: false, message: "form_slug and record_id are required" });

      const record = await FormData.findOne({ _id: targetId, form_slug, deleted_at: null });
      if (!record) return res.status(404).json({ success: false, message: "Record not found" });

      const newStatus = is_active === false ? "inactive" : "active";
      await FormData.findByIdAndUpdate(targetId, { "data.is_active": is_active !== false, status: newStatus });

      return res.json({ success: true, message: `Record ${is_active !== false ? "activated" : "deactivated"}` });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // ================================================================
  // SOFT DELETE — mark record deleted
  // ================================================================
  deleteRecord: async (req, res) => {
    try {
      const { form_slug, record_id, id, selected_data } = req.body;
      const targetId = record_id || id || selected_data?.id || selected_data?._id;
      if (!form_slug || !targetId) return res.status(400).json({ success: false, message: "form_slug and record_id are required" });

      await FormData.findOneAndUpdate({ _id: targetId, form_slug, deleted_at: null }, { deleted_at: new Date(), updated_by: req.user?.user_id });

      await AuditLog.create({ action: "delete", module: form_slug, record_id: targetId, user_id: req.user?.user_id });

      return res.json({ success: true, message: "Record deleted" });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },
};

module.exports = dynamicFormController;
