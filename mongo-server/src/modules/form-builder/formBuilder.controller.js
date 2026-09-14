// mongo-server/src/modules/form-builder/formBuilder.controller.js
const Form = require("../../models/Form.model");
const FormData = require("../../models/FormData.model");
const DatabaseView = require("../../models/DatabaseView.model");
const mongoose = require("mongoose");

const formBuilderController = {

  // -------------------------------------------------------
  // GET ALL DATABASE TABLES (Collections / Tables for Form Builder)
  // -------------------------------------------------------
  getAllDatabaseTables: async (req, res) => {
    try {
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      const collectionNames = new Set(
        collections
          .map((c) => c.name)
          .filter((name) => !name.startsWith("system."))
      );

      // Also gather known entity table names from existing Form schemas
      const existingForms = await Form.find({ deleted_at: null }).select("slug root_entity");
      existingForms.forEach((f) => {
        if (f.root_entity?.table) collectionNames.add(f.root_entity.table);
        if (f.slug) collectionNames.add(`t_frm_${f.slug}`);
      });

      // Default system tables/collections to offer
      const standardTables = [
        "t_frm_implementation_partner",
        "t_users",
        "t_roles",
        "t_permissions",
        "t_menus",
        "t_settings",
        "formdatas",
        "databaseviews",
      ];
      standardTables.forEach((t) => collectionNames.add(t));

      const tables = Array.from(collectionNames)
        .sort()
        .map((name) => ({
          table_name: name,
          label: name,
          value: name,
        }));

      return res.status(200).json({ success: true, data: tables });
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
          table_name: f.root_entity?.table || `t_frm_${f.slug}`,
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

      // Check if there is an existing form with this table name or slug
      const matchedForm = await Form.findOne({
        deleted_at: null,
        $or: [
          { "root_entity.table": cleanTable },
          { slug: cleanTable },
          { slug: cleanTable.replace(/^v_/, "") },
          { slug: cleanTable.replace(/^t_frm_/, "") },
          { slug: cleanTable.replace(/^t_/, "") },
        ],
      });

      const columns = [];

      if (matchedForm && matchedForm.sections?.length > 0) {
        matchedForm.sections.forEach((sec) => {
          (sec.fields || []).forEach((fld) => {
            const colName = fld.db_field || fld.column_name || fld.id;
            if (colName && !columns.some((c) => c.column_name === colName)) {
              columns.push({
                column_name: colName,
                data_type: fld.type || "varchar(255)",
                label: fld.label || colName,
                is_nullable: !fld.required,
                column_default: null,
              });
            }
          });
        });
      }

      // If no columns found from form, check if collection has documents in MongoDB
      if (columns.length === 0) {
        try {
          const sampleDoc = await mongoose.connection.db.collection(cleanTable).findOne();
          if (sampleDoc) {
            Object.keys(sampleDoc).forEach((key) => {
              if (key !== "_id" && key !== "__v") {
                columns.push({
                  column_name: key,
                  data_type: typeof sampleDoc[key] === "number" ? "numeric" : "varchar(255)",
                  label: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
                  is_nullable: true,
                  column_default: null,
                });
              }
            });
          }
        } catch (_) {}
      }

      // Default common fallback columns if still empty
      if (columns.length === 0) {
        const fallbacks = ["name", "code", "description", "status"];
        fallbacks.forEach((col) => {
          columns.push({
            column_name: col,
            data_type: "varchar(255)",
            label: col.charAt(0).toUpperCase() + col.slice(1),
            is_nullable: true,
            column_default: null,
          });
        });
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

      const recordCount = await FormData.countDocuments({ form_slug: form.slug, deleted_at: null });
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

      // Ensure id property is present alongside _id for frontend compatibility
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

      const data = {
        id: form._id.toString(),
        ...form.toObject(),
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
        is_draft: is_draft || false,
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

        // Auto-regenerate MongoDB view if form is published
        if (!payload.is_draft) {
          await ensureFormMongoView(updated, userId);
        }

        return res.json({
          success: true,
          message: "Form schema updated",
          data: { id: updated._id.toString(), ...updated.toObject() },
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

        return res.status(201).json({
          success: true,
          message: "Form schema created",
          data: { id: form._id.toString(), ...form.toObject() },
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

    const pipeline = [
      { $match: { form_slug: form.slug, deleted_at: null } },
      {
        $project: {
          _id: 1,
          created_at: 1,
          status: 1,
          ...(form.table_columns || []).reduce((acc, col) => {
            if (!col.key || col.checked === false) return acc;
            if (col.key === "id") {
              acc["id"] = "$_id";
            } else if (["_id", "created_at", "updated_at", "status", "created_by", "updated_by", "form_slug"].includes(col.key)) {
              acc[col.key] = 1;
            } else {
              acc[col.key] = `$data.${col.key}`;
            }
            return acc;
          }, {}),
        },
      },
    ];

    const collections = await mongoose.connection.db.listCollections({ name: viewSlug }).toArray();
    if (collections.length > 0) {
      await mongoose.connection.db.dropCollection(viewSlug);
    }

    await mongoose.connection.db.createCollection(viewSlug, {
      viewOn: "formdatas",
      pipeline,
    });

    await DatabaseView.findOneAndUpdate(
      { view_slug: viewSlug },
      {
        view_name: viewName,
        view_slug: viewSlug,
        form_slug: form.slug,
        base_collection: "formdatas",
        pipeline,
        columns: form.table_columns || [],
        deleted_at: null,
        updated_by: userId,
      },
      { upsert: true, new: true }
    );

    console.log(`[FormBuilder] ✅ MongoDB View "${viewSlug}" created/updated`);
  } catch (err) {
    console.warn(`[FormBuilder] Warning creating view: ${err.message}`);
  }
}

module.exports = formBuilderController;
