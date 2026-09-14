// server/src/modules/form-builder/helper/syncFormSchema.helper.js
// ============================================================
// Sync Form Builder schemas directly into t_form and t_section
// ============================================================

const db = require("../../../config/db");

/**
 * Syncs form definition from Form Builder (t_form_schemas)
 * into the normalized t_form and t_section relational tables.
 */
async function syncFormToTFormAndTSection({ formName, slug, tableName, formDefinition, isMaster = false, isDraft = false, parentFormId = null, actions, enableActionTabs, actionTabs, tableColumns, viewName, viewSlug, triggers, enableApproval, userId = 0 }) {
  try {
    const def = typeof formDefinition === "string" ? JSON.parse(formDefinition) : (formDefinition || {});
    const rawSections = def.sections || def.tabs || [];

    // 1. Check if t_form table exists
    const tableCheck = await db.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 't_form'
      )`
    );
    if (!tableCheck.rows[0]?.exists) {
      console.warn("[SyncFormSchema] t_form table does not exist yet. Skipping sync.");
      return null;
    }

    // Ensure columns exist in t_form
    await db.query(`ALTER TABLE t_form ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT FALSE`).catch(() => {});
    await db.query(`ALTER TABLE t_form ADD COLUMN IF NOT EXISTS modal_size VARCHAR(50) DEFAULT '1400'`).catch(() => {});
    await db.query(`ALTER TABLE t_form ADD COLUMN IF NOT EXISTS parent_form_id VARCHAR(255)`).catch(() => {});
    await db.query(`ALTER TABLE t_form ALTER COLUMN parent_form_id TYPE VARCHAR(255) USING parent_form_id::text`).catch(() => {});
    await db.query(`ALTER TABLE t_form ADD COLUMN IF NOT EXISTS enable_action_tabs BOOLEAN DEFAULT FALSE`).catch(() => {});
    await db.query(`ALTER TABLE t_form ADD COLUMN IF NOT EXISTS action_tabs JSONB DEFAULT '[]'::jsonb`).catch(() => {});
    await db.query(`ALTER TABLE t_form ADD COLUMN IF NOT EXISTS table_columns JSONB DEFAULT '[]'::jsonb`).catch(() => {});
    await db.query(`ALTER TABLE t_form ADD COLUMN IF NOT EXISTS view_name VARCHAR(255)`).catch(() => {});
    await db.query(`ALTER TABLE t_form ADD COLUMN IF NOT EXISTS view_slug VARCHAR(255)`).catch(() => {});
    await db.query(`ALTER TABLE t_form ADD COLUMN IF NOT EXISTS triggers JSONB DEFAULT '[]'::jsonb`).catch(() => {});
    await db.query(`ALTER TABLE t_form ADD COLUMN IF NOT EXISTS enable_approval BOOLEAN DEFAULT FALSE`).catch(() => {});
    await db.query(`ALTER TABLE t_form ADD COLUMN IF NOT EXISTS relation_with_parent JSONB`).catch(() => {});

    // 2. Check if form already exists in t_form by slug
    const formRes = await db.query(
      `SELECT form_id FROM t_form WHERE slug = $1 LIMIT 1`,
      [slug]
    );

    let formId;
    const modalSizeValue = formDefinition?.modal_size || formDefinition?.modalSize || "1400";
    const rootEntityJson = JSON.stringify({ table: tableName, primary_key: "id", modal_size: modalSizeValue });
    const actionsJson = actions !== undefined ? JSON.stringify(actions) : null;
    const actionTabsJson = actionTabs !== undefined ? JSON.stringify(actionTabs) : (def.action_tabs ? JSON.stringify(def.action_tabs) : null);
    const isEnableTabs = enableActionTabs !== undefined ? !!enableActionTabs : (def.enable_action_tabs !== undefined ? !!def.enable_action_tabs : false);
    const tableColumnsJson = tableColumns !== undefined ? JSON.stringify(tableColumns) : (def.table_columns ? JSON.stringify(def.table_columns) : null);
    const triggersJson = triggers !== undefined ? JSON.stringify(triggers) : (def.triggers ? JSON.stringify(def.triggers) : null);
    const isEnableApproval = enableApproval !== undefined ? !!enableApproval : (def.enable_approval !== undefined ? !!def.enable_approval : undefined);
    const effectiveViewName = viewName || def.view_name || `v_${slug}`;
    const effectiveViewSlug = viewSlug || def.view_slug || `v_${slug}`;
    const relationWithParent = formDefinition?.relation_with_parent !== undefined ? formDefinition.relation_with_parent : (def.relation_with_parent !== undefined ? def.relation_with_parent : undefined);
    const relationWithParentJson = relationWithParent !== undefined ? JSON.stringify(relationWithParent) : null;

    let parsedParentFormId = null;
    if (parentFormId && parentFormId !== "NaN" && parentFormId !== "undefined" && parentFormId !== "null") {
      const pNum = parseInt(parentFormId, 10);
      parsedParentFormId = isNaN(pNum) ? String(parentFormId) : String(pNum);
    }

    if (formRes.rows.length > 0) {
      formId = formRes.rows[0].form_id;
      // Update t_form — only set is_master if explicitly provided
      if (isMaster !== undefined) {
        await db.query(
          `UPDATE t_form
           SET title = $1, root_entity = $2, is_master = $3, is_draft = $4, modal_size = $5,
               actions = COALESCE($6::jsonb, actions), parent_form_id = $7,
               enable_action_tabs = $8, action_tabs = COALESCE($9::jsonb, action_tabs, '[]'::jsonb),
               table_columns = COALESCE($10::jsonb, table_columns, '[]'::jsonb),
               view_name = COALESCE($11, view_name),
               view_slug = COALESCE($12, view_slug),
               triggers = COALESCE($13::jsonb, triggers, '[]'::jsonb),
               enable_approval = COALESCE($14, enable_approval, FALSE),
               relation_with_parent = COALESCE($15::jsonb, relation_with_parent),
               is_active = TRUE, deleted_at = NULL,
               updated_by = $16, updated_at = NOW()
           WHERE form_id = $17`,
          [formName, rootEntityJson, !!isMaster, !!isDraft, modalSizeValue, actionsJson, parsedParentFormId, isEnableTabs, actionTabsJson, tableColumnsJson, effectiveViewName, effectiveViewSlug, triggersJson, isEnableApproval, relationWithParentJson, userId, formId]
        );
      } else {
        await db.query(
          `UPDATE t_form
           SET title = $1, root_entity = $2, is_draft = $3, modal_size = $4,
               actions = COALESCE($5::jsonb, actions), parent_form_id = $6,
               enable_action_tabs = $7, action_tabs = COALESCE($8::jsonb, action_tabs, '[]'::jsonb),
               table_columns = COALESCE($9::jsonb, table_columns, '[]'::jsonb),
               view_name = COALESCE($10, view_name),
               view_slug = COALESCE($11, view_slug),
               triggers = COALESCE($12::jsonb, triggers, '[]'::jsonb),
               enable_approval = COALESCE($13, enable_approval, FALSE),
               relation_with_parent = COALESCE($14::jsonb, relation_with_parent),
               is_active = TRUE, deleted_at = NULL,
               updated_by = $15, updated_at = NOW()
           WHERE form_id = $16`,
          [formName, rootEntityJson, !!isDraft, modalSizeValue, actionsJson, parsedParentFormId, isEnableTabs, actionTabsJson, tableColumnsJson, effectiveViewName, effectiveViewSlug, triggersJson, isEnableApproval, relationWithParentJson, userId, formId]
        );
      }
    } else {
      // Build default actions if none provided
      const defaultActions = actionsJson || JSON.stringify([
        { name: "View",   slug: "view",   type: "OPEN_MODAL", roles: ["admin", "user"] },
        { name: "Edit",   slug: "edit",   type: "OPEN_MODAL", roles: ["admin"] },
        { name: "Delete", slug: "delete",                     roles: ["admin"] }
      ]);

      // Insert into t_form
      const insertFormRes = await db.query(
        `INSERT INTO t_form (title, slug, root_entity, is_master, is_draft, modal_size, actions, parent_form_id, enable_action_tabs, action_tabs, table_columns, view_name, view_slug, triggers, enable_approval, relation_with_parent, is_active, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, COALESCE($10::jsonb, '[]'::jsonb), COALESCE($11::jsonb, '[]'::jsonb), $12, $13, COALESCE($14::jsonb, '[]'::jsonb), $15, $16::jsonb, TRUE, $17, $17)
         RETURNING form_id`,
        [formName, slug, rootEntityJson, !!isMaster, !!isDraft, modalSizeValue, defaultActions, parsedParentFormId, isEnableTabs, actionTabsJson, tableColumnsJson, effectiveViewName, effectiveViewSlug, triggersJson, !!isEnableApproval, relationWithParentJson, userId]
      );
      formId = insertFormRes.rows[0]?.form_id;
    }

    if (!formId) return null;

    // 3. Process Sections
    const hasRawSections = (def.sections && def.sections.length > 0) || (def.tabs && def.tabs.length > 0);
    if (!hasRawSections && formRes.rows.length > 0) {
      console.log(`[SyncFormSchema] No sections provided for existing form "${slug}". Preserving existing sections.`);
      return formId;
    }

    const sectionsToSync = rawSections.length > 0 ? rawSections : [
      {
        section_label: formName,
        type: "general",
        slug: slug,
        table: tableName,
        primary_key: "id",
        relation: null,
        fields: def.fields || []
      }
    ];

    for (let idx = 0; idx < sectionsToSync.length; idx++) {
      const sec = sectionsToSync[idx];
      const secLabel = sec.section_label || sec.title || formName;
      const secType = sec.type || "general";
      const secSlug = sec.slug || `${slug}_sec_${idx + 1}`;
      let secTable = sec.table || tableName;
      let secPK = sec.primary_key || "id";
      let secRel = sec.relation ? (typeof sec.relation === "string" ? sec.relation : JSON.stringify(sec.relation)) : null;

      if (secType === "add_more") {
        const storageType = sec.storage_type || "table";
        if (storageType === "table") {
          const rawSecSlug = sec.slug || `${slug}_sec_${idx + 1}`;
          const secSlugClean = rawSecSlug.startsWith(`${slug}_`) ? rawSecSlug : `${slug}_${rawSecSlug}`;
          secTable = sec.table || `t_frm_${secSlugClean}`;
          secPK = sec.primary_key || "id";
          if (!secRel) {
            secRel = JSON.stringify({ type: "one_to_many", parent_table: tableName, foreign_key: "parent_id" });
          }
        }
      }
      const secFields = JSON.stringify(
        (sec.fields || []).map((f) => {
          const col = f.column_name || f.db_field;
          return {
            ...f,
            id: f.id || col,
            column_name: col,
            db_field: col,
            type: f.type || "text",
            label: f.label || col,
            visible: f.visible !== false,
            add_to_query: true,
            add_to_list: f.add_to_list !== false,
          };
        })
      );

      const existingCtx = typeof sec.context === "string" ? JSON.parse(sec.context || "{}") : (sec.context || {});
      const secContext = JSON.stringify({
        ...existingCtx,
        // Root-level flags always win over previously stored context values
        is_master_driven: sec.is_master_driven !== undefined ? !!sec.is_master_driven : (existingCtx.is_master_driven ?? false),
        master_source: sec.master_source !== undefined ? (sec.master_source || null) : (existingCtx.master_source ?? null),
        allow_add_rows: sec.allow_add_rows !== undefined ? sec.allow_add_rows : (existingCtx.allow_add_rows ?? true),
        allow_delete_rows: sec.allow_delete_rows !== undefined ? sec.allow_delete_rows : (existingCtx.allow_delete_rows ?? true),
      });

      // Check existing section
      const secCheck = await db.query(
        `SELECT section_id FROM t_section WHERE section_form_id = $1 AND slug = $2 LIMIT 1`,
        [formId, secSlug]
      );

      if (secCheck.rows.length > 0) {
        // Update section (and reactivate if previously deleted)
        await db.query(
          `UPDATE t_section 
           SET section_label = $1, type = $2, "table" = $3, primary_key = $4, 
               relation = $5, fields = $6, context = $7, is_active = TRUE, deleted_at = NULL, updated_by = $8, updated_at = NOW()
           WHERE section_id = $9`,
          [secLabel, secType, secTable, secPK, secRel, secFields, secContext, userId, secCheck.rows[0].section_id]
        );
      } else {
        // Insert section
        await db.query(
          `INSERT INTO t_section (section_form_id, section_label, type, slug, "table", primary_key, relation, fields, context, is_active, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, $10)`,
          [formId, secLabel, secType, secSlug, secTable, secPK, secRel, secFields, secContext, userId]
        );
      }
    }

    // 3.5 Deactivate / soft-delete sections that were removed from the form schema
    const activeSectionSlugs = sectionsToSync.map((s, idx) => s.slug || `${slug}_sec_${idx + 1}`);
    if (activeSectionSlugs.length > 0) {
      await db.query(
        `UPDATE t_section
         SET is_active = FALSE, deleted_at = NOW(), updated_by = $1, updated_at = NOW()
         WHERE section_form_id = $2
           AND (deleted_at IS NULL OR is_active = TRUE)
           AND slug NOT IN (${activeSectionSlugs.map((_, i) => `$${i + 3}`).join(", ")})`,
        [userId, formId, ...activeSectionSlugs]
      );
    }

    // 4. Auto-sync into t_master_configs if isMaster is true
    if (isMaster) {
      const allFields = sectionsToSync.flatMap((s) => s.fields || []);
      const isFkOrId = (f) => {
        const col = (f.column_name || f.db_field || "").toLowerCase();
        return !col || col === "id" || col.endsWith("_id") || col.endsWith("_pk") || f.data_source || f.type === "select" || f.type === "multiselect";
      };

      const nameField = allFields.find(
        (f) => !isFkOrId(f) && (
          (f.column_name || f.db_field || "").toLowerCase().includes("name") ||
          (f.column_name || f.db_field || "").toLowerCase().includes("title") ||
          (f.column_name || f.db_field || "").toLowerCase().includes("label") ||
          (f.label && typeof f.label === "string" && f.label.toLowerCase().includes("name"))
        )
      ) || allFields.find((f) => !isFkOrId(f) && (f.type === "text" || f.type === "textarea" || f.type === "string"))
        || allFields.find((f) => !isFkOrId(f));

      const detectedLabelKey = nameField?.column_name || nameField?.db_field || "name";

      const fkField = allFields.find(
        (f) => f.data_source || f.type === "select" || f.type === "multiselect" || (
          (f.column_name || f.db_field || "").toLowerCase().endsWith("_id") && (f.column_name || f.db_field || "").toLowerCase() !== "id"
        )
      );
      const detectedForeignKey = fkField?.column_name || fkField?.db_field || null;

      await upsertMasterConfig({
        slug,
        tableName,
        primaryKey: "id",
        labelKey: detectedLabelKey,
        isActiveKey: "is_active",
        foreignKey: detectedForeignKey,
      });
    }

    // Auto-grant permissions for Admin roles in t_permissions & t_role_permissions
    await autoGrantAdminPermissions(slug, formName);

    console.log(`[SyncFormSchema] ✅ Successfully synced form "${slug}" (${formId}) into t_form and t_section.`);
    return formId;
  } catch (err) {
    console.error("[SyncFormSchema] Error syncing to t_form / t_section:", err.message);
    return null;
  }
}

/**
 * Auto-grants module permissions for new/updated forms to all Admin roles in t_permissions & t_role_permissions
 */
async function autoGrantAdminPermissions(slug, formName) {
  if (!slug) return;
  try {
    const actions = ["read", "create", "update", "delete", "export", "import", "approve"];
    const moduleName = slug.trim().toLowerCase();

    // Find all Admin / Configurator roles
    const adminRolesRes = await db.query(
      `SELECT id FROM t_roles
       WHERE (is_configurator = TRUE OR slug ILIKE '%admin%' OR name ILIKE '%admin%' OR slug = 'configurator')
         AND deleted_at IS NULL`
    ).catch(() => ({ rows: [] }));

    const adminRoleIds = adminRolesRes.rows.map((r) => r.id);
    if (adminRoleIds.length === 0) return;

    for (const act of actions) {
      const permKey = `${moduleName}.${act}`;

      let permRes = await db.query(
        `SELECT id FROM t_permissions WHERE key = $1 AND deleted_at IS NULL LIMIT 1`,
        [permKey]
      );
      let permId = permRes.rows[0]?.id;

      if (!permId) {
        const ins = await db.query(
          `INSERT INTO t_permissions (module, key, type, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW())
           RETURNING id`,
          [moduleName, permKey, act]
        ).catch(() => null);
        permId = ins?.rows?.[0]?.id;
      }

      if (permId) {
        for (const roleId of adminRoleIds) {
          await db.query(
            `INSERT INTO t_role_permissions (role_id, permission_id, created_by, updated_by, created_at, updated_at)
             VALUES ($1, $2, 1, 1, NOW(), NOW())
             ON CONFLICT DO NOTHING`,
            [roleId, permId]
          ).catch(() => {});
        }
      }
    }
    console.log(`[SyncFormSchema] ✅ Auto-granted admin permissions in t_role_permissions for module "${moduleName}".`);
  } catch (err) {
    console.warn("[SyncFormSchema] Error auto-granting admin permissions:", err.message);
  }
}

/**
 * Upserts a master configuration into t_master_configs
 */
async function upsertMasterConfig({ slug, tableName, primaryKey = "id", labelKey, isActiveKey = "is_active", foreignKey = null }) {
  if (!slug || !tableName) return;
  try {
    const tableCheck = await db.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 't_master_configs'
      )`
    );
    if (!tableCheck.rows[0]?.exists) return;

    const existing = await db.query(
      `SELECT id FROM t_master_configs WHERE slug = $1 OR table_name = $2 LIMIT 1`,
      [slug, tableName]
    );

    const finalLabelKey = labelKey || "name";

    if (existing.rows.length > 0) {
      await db.query(
        `UPDATE t_master_configs
         SET slug = $1, table_name = $2, primary_key = $3, label_key = $4, is_active_key = $5, foreign_key = $6, updated_at = NOW()
         WHERE id = $7`,
        [slug, tableName, primaryKey, finalLabelKey, isActiveKey, foreignKey, existing.rows[0].id]
      );
      console.log(`[MasterConfig] ✅ Updated t_master_configs for slug "${slug}" -> label_key: "${finalLabelKey}", foreign_key: "${foreignKey}"`);
    } else {
      await db.query(
        `INSERT INTO t_master_configs (slug, table_name, primary_key, label_key, is_active_key, foreign_key, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [slug, tableName, primaryKey, finalLabelKey, isActiveKey, foreignKey]
      );
      console.log(`[MasterConfig] ✅ Inserted t_master_configs for slug "${slug}" -> label_key: "${finalLabelKey}", foreign_key: "${foreignKey}"`);
    }
  } catch (err) {
    console.warn("[MasterConfig] Error upserting into t_master_configs:", err.message);
  }
}

module.exports = { syncFormToTFormAndTSection, autoGrantAdminPermissions, upsertMasterConfig };
