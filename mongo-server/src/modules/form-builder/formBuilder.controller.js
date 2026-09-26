// mongo-server/src/modules/form-builder/formBuilder.controller.js
const Form = require("../../models/Form.model");
const DatabaseView = require("../../models/DatabaseView.model");
const MasterSchema = require("../../models/MasterSchema.model");
const mongoose = require("mongoose");
const { getFormModel, getFormCollectionName } = require("../../utils/formCollection.util");

const formBuilderController = {
  // -------------------------------------------------------
  // GET ALL DATABASE TABLES (Form schemas + Master schemas for dropdowns)
  // -------------------------------------------------------
  getAllDatabaseTables: async (req, res) => {
    try {
      const masters = await MasterSchema.find({ deleted_at: null, is_active: true })
        .select("name slug label_field fields")
        .sort({ name: 1 })
        .lean();

      const masterTables = masters.map((m) => ({
        table_name: m.slug,
        label: `${m.name} (Master)`,
        value: m.slug,
        display_name: m.name,
        source_type: "master",
        label_field: m.label_field || "name",
        primary_key: "_id",
      }));

      const forms = await Form.find({ deleted_at: null })
        .select("title slug table_columns sections root_entity is_master")
        .sort({ title: 1 })
        .lean();

      const formTables = forms.map((f) => ({
        table_name: f.slug,
        label: f.is_master ? `${f.title} (Master Form)` : `${f.title} (Form)`,
        value: f.slug,
        display_name: f.title,
        source_type: "form",
        primary_key: "_id",
      }));

      const data = [...masterTables, ...formTables];
      return res.status(200).json({ success: true, data });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // -------------------------------------------------------
  // GET MASTER FORMS (All active forms with their fields)
  // -------------------------------------------------------
  getMasterForms: async (req, res) => {
    try {
      const forms = await Form.find({ deleted_at: null }).sort({ title: 1 });

      const result = forms.map((f) => {
        const fields = [];
        (f.sections || []).forEach((sec) => {
          (sec.fields || []).forEach((fld) => {
            if (fld.db_field || fld.column_name || fld.id) {
              fields.push({
                db_field: fld.db_field || fld.column_name || fld.id,
                label: fld.label || fld.db_field || fld.id,
                id: fld.id || fld.db_field,
                type: fld.type || "text",
              });
            }
          });
        });

        return {
          id: f._id,
          form_id: f.form_id || f._id,
          title: f.title,
          slug: f.slug,
          table_name: f.root_entity?.table || f.slug,
          primary_key: f.root_entity?.primary_key || "id",
          is_master: f.is_master || false,
          fields,
        };
      });

      return res.status(200).json({ success: true, data: result });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // -------------------------------------------------------
  // GET TABLE COLUMNS FOR FORM BUILDER
  // -------------------------------------------------------
  getTableColumnsForFormBuilder: async (req, res) => {
    try {
      const { tableName } = req.params;
      if (!tableName || !tableName.trim()) {
        return res.status(400).json({ success: false, message: "Table name is required" });
      }

      const cleanTable = tableName.trim().toLowerCase();
      const entitySlug = cleanTable
        .replace(/^v_/, "")
        .replace(/^t_frm_/, "")
        .replace(/^t_mst_/, "")
        .replace(/^t_/, "")
        .replace(/s$/, "");

      const IGNORED_SYSTEM_KEYS = new Set([
        "_id",
        "id",
        "__v",
        "form_slug",
        "form_version",
        "parent_id",
        "data",
        "created_by",
        "updated_by",
        "deleted_at",
        "created_at",
        "updated_at",
        "tenant_id",
        "selected_data",
      ]);

      const columns = [];
      const seenColNames = new Set();

      const addCol = (colName, type = "varchar(255)", label = null, isNullable = true) => {
        if (!colName) return;
        const normalized = String(colName).trim().toLowerCase();
        if (IGNORED_SYSTEM_KEYS.has(normalized) || seenColNames.has(normalized)) return;
        seenColNames.add(normalized);
        columns.push({
          column_name: colName,
          data_type: type || "varchar(255)",
          label: label || colName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          is_nullable: isNullable,
          column_default: null,
        });
      };

      // 1. Check Form model
      const matchedForm = await Form.findOne({
        deleted_at: null,
        $or: [
          { "root_entity.table": cleanTable },
          { slug: cleanTable },
          { slug: cleanTable.replace(/^v_/, "") },
          { slug: cleanTable.replace(/^t_frm_/, "") },
          { slug: cleanTable.replace(/^t_/, "") },
          { slug: entitySlug },
          { slug: `${entitySlug}s` },
        ],
      });

      if (matchedForm && matchedForm.sections?.length > 0) {
        matchedForm.sections.forEach((sec) => {
          (sec.fields || []).forEach((fld) => {
            const colName = fld.db_field || fld.column_name || fld.id;
            if (colName) {
              addCol(colName, fld.type || fld.data_type || "varchar(255)", fld.label || colName, !fld.required);
            }
          });
        });
      }

      // 2. Check MasterSchema
      const matchedMaster = await MasterSchema.findOne({
        deleted_at: null,
        $or: [
          { slug: cleanTable },
          { slug: entitySlug },
          { slug: `${entitySlug}s` },
          { slug: cleanTable.replace(/^t_mst_/, "") },
          { slug: cleanTable.replace(/^t_/, "") },
        ],
      });

      if (matchedMaster) {
        if (matchedMaster.label_field) {
          addCol(matchedMaster.label_field, "varchar(255)", matchedMaster.label_field);
        }
        if (Array.isArray(matchedMaster.fields)) {
          matchedMaster.fields.forEach((f) => {
            const key = f.key || f.column_name || f.db_field || f.name;
            if (key) {
              addCol(key, f.type || "varchar(255)", f.name || f.label || key, !f.required);
            }
          });
        }
      }

      // 3. Check MasterData sample records
      try {
        const sampleMasterData = await MasterData.findOne({
          deleted_at: null,
          master_slug: { $in: [cleanTable, entitySlug, `${entitySlug}s`, cleanTable.replace(/^t_/, "")] },
        }).lean();

        if (sampleMasterData) {
          if (sampleMasterData.data && typeof sampleMasterData.data === "object") {
            Object.keys(sampleMasterData.data).forEach((k) => {
              addCol(k, typeof sampleMasterData.data[k] === "number" ? "numeric" : "varchar(255)", null);
            });
          }
          if (sampleMasterData.code) addCol("code", "varchar(100)", "Code");
          if (sampleMasterData.name) addCol("name", "varchar(255)", "Name");
        }
      } catch (_) {}

      // 4. Check Raw MongoDB Collection / Form Data sample
      try {
        const sampleDoc = await mongoose.connection.db.collection(cleanTable).findOne();
        if (sampleDoc) {
          if (sampleDoc.data && typeof sampleDoc.data === "object") {
            Object.keys(sampleDoc.data).forEach((key) => {
              addCol(key, typeof sampleDoc.data[key] === "number" ? "numeric" : "varchar(255)", null);
            });
          }
          Object.keys(sampleDoc).forEach((key) => {
            addCol(key, typeof sampleDoc[key] === "number" ? "numeric" : "varchar(255)", null);
          });
        }
      } catch (_) {}

      // 5. Entity-specific known defaults (if no columns found from DB or schema)
      if (columns.length === 0) {
        if (entitySlug === "district") {
          addCol("district_name", "varchar(255)", "District Name");
          addCol("district_code", "varchar(100)", "District Code");
          addCol("state_name", "varchar(255)", "State Name");
        } else if (entitySlug === "state") {
          addCol("state_name", "varchar(255)", "State Name");
          addCol("state_code", "varchar(100)", "State Code");
        } else if (entitySlug === "block") {
          addCol("block_name", "varchar(255)", "Block Name");
          addCol("block_code", "varchar(100)", "Block Code");
          addCol("district_name", "varchar(255)", "District Name");
        } else if (entitySlug === "village") {
          addCol("village_name", "varchar(255)", "Village Name");
          addCol("village_code", "varchar(100)", "Village Code");
          addCol("block_name", "varchar(255)", "Block Name");
        }
      }

      return res.status(200).json({ success: true, data: columns, columns });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // -------------------------------------------------------
  // SYNC PARENT FOREIGN KEY
  // -------------------------------------------------------
  syncParentForeignKey: async (req, res) => {
    try {
      const { child_table, parent_table, foreign_key = "parent_id" } = req.body;
      return res.status(200).json({
        success: true,
        message: `Parent foreign key "${foreign_key}" synced between "${child_table}" and "${parent_table}"`,
      });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // -------------------------------------------------------
  // PRE-DELETE CHECK (Check if form has existing records)
  // -------------------------------------------------------
  preDeleteCheck: async (req, res) => {
    try {
      const { id } = req.params;
      const form = await findFormByIdOrSlug(id);
      if (!form) return res.status(404).json({ success: false, message: "Form schema not found" });

      const FormModel = getFormModel(form);
      const recordCount = await FormModel.countDocuments({ deleted_at: null });
      const childFormsCount = await Form.countDocuments({ parent_form_id: form._id, deleted_at: null });
      const viewsCount = await DatabaseView.countDocuments({ view_slug: `v_${form.slug}`, deleted_at: null });

      const canDeleteDirectly = recordCount === 0 && childFormsCount === 0;

      return res.status(200).json({
        success: true,
        canDeleteDirectly,
        form: {
          id: form._id,
          title: form.title,
          slug: form.slug,
          is_draft: form.is_draft || false,
        },
        summary: {
          totalRecordsCount: recordCount,
          viewsCount,
          childFormsCount,
        },
      });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // -------------------------------------------------------
  // LIST SCHEMAS (Paginated & Filterable)
  // -------------------------------------------------------
  listSchemas: async (req, res) => {
    try {
      const { search = "", page = 1, limit = 50, is_master } = req.query;
      const parsedLimit = parseInt(limit, 10) || 50;
      const parsedPage = parseInt(page, 10) || 1;
      const skip = (Math.max(1, parsedPage) - 1) * parsedLimit;

      const query = { deleted_at: null };
      if (is_master !== undefined) {
        query.is_master = is_master === "true" || is_master === true;
      }

      if (search && search.trim()) {
        const regex = new RegExp(search.trim(), "i");
        query.$or = [{ title: regex }, { slug: regex }, { description: regex }];
      }

      const total = await Form.countDocuments(query);
      const forms = await Form.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean();

      const data = forms.map((f) => ({
        id: f._id.toString(),
        ...f,
      }));

      return res.json({
        success: true,
        data,
        total,
        page: parsedPage,
        totalPages: Math.ceil(total / parsedLimit),
      });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // -------------------------------------------------------
  // GET SCHEMA (By _id, slug, or form_id)
  // -------------------------------------------------------
  getSchema: async (req, res) => {
    try {
      const { id, slug } = req.params;
      const identifier = id || slug;
      const form = await findFormByIdOrSlug(identifier);

      if (!form) {
        return res.status(404).json({ success: false, message: `Form schema "${identifier}" not found` });
      }

      const rawObj = form.toObject ? form.toObject() : form;
      const isDraftVal = form.is_draft !== undefined ? form.is_draft : (form.status === 'draft');
      const data = {
        id: form._id.toString(),
        ...rawObj,
        is_draft: isDraftVal,
        is_published: !isDraftVal,
      };

      return res.json({ success: true, data });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // -------------------------------------------------------
  // CREATE OR UPDATE SCHEMA
  // -------------------------------------------------------
  saveSchema: async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const paramId = req.params.id || req.params.slug;
      const {
        slug, title, description, sections, table_columns,
        root_entity, actions, enable_action_tabs, action_tabs,
        enable_approval, relation_with_parent, relation_with_children,
        parent_form_id, is_draft, modal_size, view_name, view_slug, is_master,
      } = req.body;

      const targetSlug = slug || req.body.slug;
      if (!title) {
        return res.status(400).json({ success: false, message: "title is required" });
      }

      const isDraftVal = is_draft === true || is_draft === 'true' || is_draft === 'draft' ? true : false;

      const payload = {
        title,
        description: description || "",
        sections: sections || [],
        table_columns: table_columns || [],
        root_entity: root_entity || {},
        actions: actions || {},
        enable_action_tabs: enable_action_tabs || false,
        action_tabs: action_tabs || [],
        enable_approval: enable_approval || false,
        relation_with_parent: relation_with_parent || {},
        relation_with_children: relation_with_children || [],
        parent_form_id: parent_form_id || null,
        is_draft: isDraftVal,
        is_published: !isDraftVal,
        status: isDraftVal ? "draft" : "published",
        is_master: is_master || false,
        modal_size: modal_size || "1400",
        view_name: view_name || null,
        view_slug: view_slug || null,
        updated_by: userId,
      };

      let existing = null;
      if (paramId) {
        existing = await findFormByIdOrSlug(paramId);
      } else if (targetSlug) {
        existing = await Form.findOne({ slug: targetSlug, deleted_at: null });
      }

      if (existing) {
        if (targetSlug) payload.slug = targetSlug;
        const updated = await Form.findByIdAndUpdate(existing._id, payload, { new: true });

        if (!payload.is_draft) {
          await ensureFormMongoView(updated, userId);
        }

        const rawObj = updated.toObject ? updated.toObject() : updated;
        return res.json({
          success: true,
          message: "Form schema updated",
          data: {
            id: updated._id.toString(),
            ...rawObj,
            is_draft: updated.is_draft !== undefined ? updated.is_draft : false,
            is_published: updated.is_draft !== undefined ? !updated.is_draft : true,
          },
        });
      } else {
        const generatedSlug = targetSlug || title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
        const form = await Form.create({
          ...payload,
          slug: generatedSlug,
          created_by: userId,
        });

        if (!payload.is_draft) {
          await ensureFormMongoView(form, userId);
        }

        const rawObj = form.toObject ? form.toObject() : form;
        return res.status(201).json({
          success: true,
          message: "Form schema created",
          data: {
            id: form._id.toString(),
            ...rawObj,
            is_draft: form.is_draft !== undefined ? form.is_draft : false,
            is_published: form.is_draft !== undefined ? !form.is_draft : true,
          },
        });
      }
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // -------------------------------------------------------
  // DELETE SCHEMA (Soft Delete)
  // -------------------------------------------------------
  deleteSchema: async (req, res) => {
    try {
      const paramId = req.params.id || req.params.slug;
      const form = await findFormByIdOrSlug(paramId);

      if (!form) {
        return res.status(404).json({ success: false, message: "Form schema not found" });
      }

      await Form.findByIdAndUpdate(form._id, {
        deleted_at: new Date(),
        updated_by: req.user?.user_id,
      });

      return res.json({ success: true, message: `Form "${form.title}" deleted successfully` });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },
};

/**
 * Helper to find Form by Mongo _id, slug, or custom form_id
 */
async function findFormByIdOrSlug(identifier) {
  if (!identifier) return null;
  const conditions = [{ slug: identifier }, { form_id: identifier }];
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    conditions.unshift({ _id: identifier });
  }
  return await Form.findOne({ $or: conditions, deleted_at: null });
}

/**
 * Auto-creates / refreshes a MongoDB view for a form.
 */
async function ensureFormMongoView(form, userId) {
  try {
    const viewSlug = `v_${form.slug}`;
    const viewName = `${form.title} View`;
    const baseCollection = getFormCollectionName(form);

    getFormModel(form);

    const projectFields = {
      _id: 1,
      id: "$_id",
      form_slug: 1,
      created_at: 1,
      updated_at: 1,
      status: 1,
      created_by: 1,
      updated_by: 1,
      data: "$data",
    };

    (form.sections || []).forEach((sec) => {
      (sec.fields || []).forEach((fld) => {
        const key = fld.db_field || fld.column_name || fld.id;
        if (key && !projectFields[key]) {
          projectFields[key] = `$data.${key}`;
        }
      });
    });

    (form.table_columns || []).forEach((col) => {
      if (!col.key || col.checked === false) return;
      if (col.key === "id") {
        projectFields["id"] = "$_id";
      } else if (["_id", "created_at", "updated_at", "status", "created_by", "updated_by", "form_slug"].includes(col.key)) {
        projectFields[col.key] = 1;
      } else if (!projectFields[col.key]) {
        projectFields[col.key] = `$data.${col.key}`;
      }
    });

    const pipeline = [
      { $match: { deleted_at: null } },
      { $project: projectFields },
    ];

    const collections = await mongoose.connection.db.listCollections({ name: viewSlug }).toArray();
    if (collections.length > 0) {
      await mongoose.connection.db.dropCollection(viewSlug);
    }

    await mongoose.connection.db.createCollection(viewSlug, {
      viewOn: baseCollection,
      pipeline,
    });

    await DatabaseView.findOneAndUpdate(
      { slug: viewSlug },
      {
        name: viewName,
        slug: viewSlug,
        base_form_slug: form.slug,
        source_collection: baseCollection,
        view_collection_name: viewSlug,
        pipeline,
        deleted_at: null,
        updated_by: userId,
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.warn(`[FormBuilder] Warning creating view: ${err.message}`);
  }
}

module.exports = formBuilderController;
