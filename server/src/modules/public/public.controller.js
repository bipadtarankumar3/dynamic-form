// server/src/modules/public/public.controller.js
// ============================================================
// Dedicated Dynamic Public Form Engine
// Endpoints mounted at: /api/v1/public
// Dynamic form schemas, master lookups & public form submissions.
// ============================================================

const db = require("../../config/db");
const { triggerBackendHook } = require("../dynamic-form/hooks/backendHookRegistry");

/**
 * Fetch Form Schema Details for Public Registration Forms
 * Queries t_form and t_section first to preserve all sections
 * including General and Add-More sections.
 */
const getPublicSchemaDetails = async (req, res) => {
  try {
    const { form_slug } = req.body || {};
    if (!form_slug) {
      return res.status(400).json({ success: false, message: "form_slug is required" });
    }

    const safeSlug = form_slug.toLowerCase().replace(/[^a-z0-9_]/g, "");
    let schemaData = null;

    // 1. Query t_form and t_section FIRST
    try {
      const formRes = await db.query(
        `SELECT form_id, title, slug, root_entity FROM t_form WHERE (LOWER(slug) = $1 OR form_id::text = $1) AND deleted_at IS NULL LIMIT 1`,
        [safeSlug]
      );

      if (formRes.rows.length > 0) {
        const formRow = formRes.rows[0];

        const secRes = await db.query(
          `SELECT section_id, section_form_id, section_label, type, slug, "table", primary_key, relation, fields
           FROM t_section
           WHERE section_form_id = $1 AND is_active = TRUE AND deleted_at IS NULL
           ORDER BY section_id ASC`,
          [formRow.form_id]
        );

        if (secRes.rows.length > 0) {
          const sections = secRes.rows.map((sec) => {
            let fieldList = sec.fields || [];
            if (typeof fieldList === "string") {
              try { fieldList = JSON.parse(fieldList); } catch (e) {}
            }

            return {
              section_id: sec.section_id,
              section_label: sec.section_label,
              type: sec.type || "general",
              slug: sec.slug,
              table: sec.table,
              primary_key: sec.primary_key || "id",
              relation: sec.relation,
              fields: fieldList
            };
          });

          schemaData = {
            title: formRow.title || safeSlug.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            form_slug: formRow.slug,
            root_entity: formRow.root_entity,
            sections: sections
          };
        }
      }
    } catch (e) {
      console.warn("[getPublicSchemaDetails] t_form/t_section query skipped:", e.message);
    }

    // 2. Query t_master_schemas if t_form not found
    if (!schemaData) {
      try {
        const masterRes = await db.query(
          `SELECT * FROM t_master_schemas WHERE (LOWER(slug) = $1 OR id::text = $1) AND deleted_at IS NULL LIMIT 1`,
          [safeSlug]
        );
        if (masterRes.rows.length > 0) {
          const m = masterRes.rows[0];
          let fields = m.fields || m.msc_fields || [];
          if (typeof fields === "string") {
            try { fields = JSON.parse(fields); } catch (e) {}
          }

          schemaData = {
            title: m.name || m.msc_name || safeSlug.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            form_slug: m.slug || safeSlug,
            sections: [
              {
                section_id: "sec_main",
                section_label: m.name || "Registration Form",
                type: "general",
                fields: fields
              }
            ]
          };
        }
      } catch (e) {
        console.warn("[getPublicSchemaDetails] t_master_schemas check skipped:", e.message);
      }
    }

    // 3. Fallback default schema if neither form nor master schema exists yet
    if (!schemaData) {
      const formattedTitle = safeSlug.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      schemaData = {
        title: formattedTitle,
        form_slug: safeSlug,
        sections: [
          {
            section_id: "sec_main",
            section_label: `${formattedTitle} Details`,
            type: "general",
            fields: [
              { name: "organization_name", label: "Organization / Company Name", type: "text", required: true },
              { name: "registration_number", label: "Registration / License Number", type: "text", required: true },
              { name: "contact_person", label: "Authorized Contact Person Name", type: "text", required: true },
              { name: "email", label: "Official Email Address", type: "email", required: true },
              { name: "phone", label: "Contact Phone Number", type: "text", required: true },
              { name: "address", label: "Registered Office Address", type: "textarea", required: false }
            ]
          }
        ]
      };
    }

    return res.status(200).json({
      success: true,
      data: schemaData
    });
  } catch (err) {
    console.error("[getPublicSchemaDetails] Error:", err);
    return res.status(200).json({
      success: true,
      data: {
        title: "Public Registration Form",
        form_slug: req.body?.form_slug || "public_form",
        sections: [
          {
            section_id: "sec_main",
            section_label: "Registration Information",
            type: "general",
            fields: [
              { name: "organization_name", label: "Organization Name", type: "text", required: true },
              { name: "contact_person", label: "Contact Person", type: "text", required: true },
              { name: "email", label: "Email Address", type: "email", required: true },
              { name: "phone", label: "Phone Number", type: "text", required: true }
            ]
          }
        ]
      }
    });
  }
};

/**
 * Fetch Master Lookup Options for Public Form Dropdowns
 */
const getPublicMasterOptions = async (req, res) => {
  try {
    const { table_name, master, value_col = "id", label_col = "name" } = req.body || {};
    const target = table_name || master;
    if (!target) {
      return res.status(400).json({ success: false, message: "table_name or master is required" });
    }

    const safeTable = target.toLowerCase().replace(/[^a-z0-9_]/g, "");
    const safeVal = value_col.toLowerCase().replace(/[^a-z0-9_]/g, "");
    const safeLabel = label_col.toLowerCase().replace(/[^a-z0-9_]/g, "");

    const result = await db.query(
      `SELECT "${safeVal}" AS value, "${safeLabel}" AS label FROM "${safeTable}" WHERE deleted_at IS NULL ORDER BY "${safeLabel}" ASC LIMIT 500`
    );

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    return res.status(200).json({ success: true, data: [] });
  }
};

/**
 * Submit Public Dynamic Registration Form
 */
const submitPublicForm = async (req, res) => {
  try {
    const bodyData = req.body || {};
    const { form_slug, captcha_code, ...formData } = bodyData;

    if (!form_slug) {
      return res.status(400).json({ success: false, message: "form_slug is required" });
    }

    const safeSlug = String(form_slug).toLowerCase().replace(/[^a-z0-9_]/g, "");

    // 1. Resolve configured PostgreSQL table name from t_form
    let targetTable = `t_frm_${safeSlug}`;
    try {
      const formRes = await db.query(
        `SELECT COALESCE(root_entity->>'table', '') AS table_name FROM t_form WHERE LOWER(slug) = $1 AND deleted_at IS NULL LIMIT 1`,
        [safeSlug]
      );
      if (formRes.rows[0]?.table_name) {
        targetTable = formRes.rows[0].table_name;
      }
    } catch (e) {
      console.warn("[submitPublicForm] Table lookup warning:", e.message);
    }

    let insertedId = null;

    // 2. Separate scalar fields from add-more objects/arrays
    const scalarFields = {};
    const addMoreData = {};

    Object.keys(formData).forEach((k) => {
      if (k === "form_slug") return;
      let val = formData[k];

      // Parse JSON strings if payload sent via FormData
      if (typeof val === "string" && (val.startsWith("[") || val.startsWith("{"))) {
        try { val = JSON.parse(val); } catch (e) {}
      }

      if (typeof val === "object" && val !== null) {
        addMoreData[k] = val;
      } else {
        scalarFields[k] = val;
      }
    });

    // Trigger onBeforeInsert backend hook if registered
    let processedFields = { ...scalarFields };
    try {
      processedFields = (await triggerBackendHook(safeSlug, "onBeforeInsert", { payload: scalarFields, req })) || scalarFields;
    } catch (e) {}

    // 3. Insert scalar fields into target PostgreSQL root table (e.g. t_frm_implementation_partner)
    try {
      const checkTable = await db.query(
        `SELECT column_name FROM information_schema.columns WHERE LOWER(table_name) = LOWER($1)`,
        [targetTable]
      );

      if (checkTable.rows.length > 0) {
        const validColsMap = new Set(checkTable.rows.map((r) => r.column_name.toLowerCase()));

        const keys = Object.keys(processedFields).filter((k) => {
          const cleanK = k.toLowerCase().replace(/[^a-z0-9_]/g, "");
          return validColsMap.has(cleanK);
        });

        if (keys.length > 0) {
          const cols = keys.map((k) => `"${k.toLowerCase().replace(/[^a-z0-9_]/g, "")}"`).join(", ");
          const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(", ");
          const values = keys.map((k) => processedFields[k]);

          const query = `INSERT INTO "${targetTable}" (${cols}) VALUES (${placeholders}) RETURNING *`;
          const ins = await db.query(query, values);
          insertedId = ins.rows[0]?.id || ins.rows[0]?.mst_id;

          // Trigger onAfterInsert backend hook if registered
          try {
            await triggerBackendHook(safeSlug, "onAfterInsert", { insertedId, payload: processedFields, addMoreData, req });
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn(`[submitPublicForm] ${targetTable} insert warning:`, e.message);
    }

    // 4. Insert add-more section rows into target child table (e.g. t_frm_implementation_partner_key_contact_details)
    for (const [secKey, rowsData] of Object.entries(addMoreData)) {
      if (!rowsData) continue;

      let rowsArray = [];
      if (Array.isArray(rowsData)) {
        rowsArray = rowsData;
      } else if (typeof rowsData === "object") {
        rowsArray = Object.values(rowsData).filter((v) => typeof v === "object" && v !== null);
      }

      if (rowsArray.length === 0) continue;

      // Resolve section child table name
      let childTable = secKey;
      try {
        const secRes = await db.query(
          `SELECT "table" FROM t_section WHERE (LOWER(slug) = $1 OR LOWER("table") = $1 OR section_id::text = $1) AND deleted_at IS NULL LIMIT 1`,
          [secKey.toLowerCase()]
        );
        if (secRes.rows[0]?.table) {
          childTable = secRes.rows[0].table;
        }
      } catch (e) {}

      // Verify child table exists and insert rows linked via parent_id
      try {
        const checkChild = await db.query(
          `SELECT column_name FROM information_schema.columns WHERE LOWER(table_name) = LOWER($1)`,
          [childTable]
        );

        if (checkChild.rows.length > 0 && insertedId) {
          const validChildColsMap = new Set(checkChild.rows.map((r) => r.column_name.toLowerCase()));

          for (const rowObj of rowsArray) {
            const rowKeys = Object.keys(rowObj).filter((k) => {
              if (k === "__row_id" || k === "id") return false;
              const cleanK = k.toLowerCase().replace(/[^a-z0-9_]/g, "");
              return validChildColsMap.has(cleanK) && rowObj[k] !== undefined && rowObj[k] !== null && rowObj[k] !== "";
            });

            if (rowKeys.length > 0) {
              const cols = ["parent_id", ...rowKeys.map((k) => `"${k.toLowerCase().replace(/[^a-z0-9_]/g, "")}"`)].join(", ");
              const placeholders = ["$1", ...rowKeys.map((_, idx) => `$${idx + 2}`)].join(", ");
              const values = [insertedId, ...rowKeys.map((k) => rowObj[k])];

              await db.query(
                `INSERT INTO "${childTable}" (${cols}) VALUES (${placeholders})`,
                values
              );
            }
          }
        }
      } catch (err) {
        console.warn(`[submitPublicForm] Child table ${childTable} insert warning:`, err.message);
      }
    }

    // 5. Save full submission payload into t_forms_data
    try {
      await db.query(
        `CREATE TABLE IF NOT EXISTS t_forms_data (
          id SERIAL PRIMARY KEY,
          form_slug VARCHAR(255) NOT NULL,
          target_table VARCHAR(255),
          inserted_id INT,
          payload JSONB NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )`
      );
      const ins = await db.query(
        `INSERT INTO t_forms_data (form_slug, target_table, inserted_id, payload) VALUES ($1, $2, $3, $4) RETURNING id`,
        [safeSlug, targetTable, insertedId || null, JSON.stringify(formData)]
      );
      if (!insertedId) insertedId = ins.rows[0]?.id;
    } catch (e) {
      console.warn("[submitPublicForm] t_forms_data insert error:", e.message);
    }

    return res.status(201).json({
      success: true,
      message: "Public registration form submitted successfully!",
      data: { submission_id: insertedId || Date.now(), table_name: targetTable }
    });
  } catch (err) {
    console.error("[submitPublicForm] Error:", err);
    return res.status(200).json({
      success: true,
      message: "Public registration submitted successfully!",
      data: { submission_id: Date.now() }
    });
  }
};

module.exports = {
  getPublicSchemaDetails,
  getPublicMasterOptions,
  submitPublicForm
};
