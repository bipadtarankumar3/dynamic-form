const { sequelize } = require("../config/db.config");

const getFormGroupDetails = async ({ form_group, is_active }) => {
  try {
    const whereClause = [];
    const replacements = {};

    if (form_group) {
      whereClause.push("tfg_slug = :tfg_slug");
      replacements.tfg_slug = form_group;
    }

    if (typeof is_active === "boolean") {
      whereClause.push("tfg_is_active = :is_active");
      replacements.is_active = is_active;
    }

    const sql = `
      SELECT
        tfg_id,
        tfg_slug,
        tfg_from_group_details,
        tfg_is_active,
        tfg_created_at,
        tfg_updated_at
      FROM t_form_group
      ${whereClause.length ? `WHERE ${whereClause.join(" AND ")}` : ""}
      LIMIT 1
    `;

    const [formGroup] = await sequelize.query(sql, {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    });

    return formGroup;
  } catch (error) {
    throw error;
  }
};

const buildFormGroupData = async (form_group) => {
  const groupDetails = await getFormGroupDetails({ form_group });

  if (!groupDetails?.tfg_from_group_details?.length) {
    return null;
  }

  // const formSchemas = await Promise.all(
  //   groupDetails.tfg_from_group_details.map(async (group) => {
  //     // 1️⃣ Try section_slug
  //     let schema = await getFormWithSection({
  //       section_slug: group.slug,
  //     });

  //     // 2️⃣ If not found, fallback to form_slug
  //     if (!schema) {
  //       schema = await getFormWithSection({
  //         form_slug: group.slug,
  //       });
  //     }

  //     return {
  //       slug: group.slug,
  //       title: group.title,
  //       form_id: group.form_id,
  //       schema,
  //     };
  //   })
  // );
  const formSchemas = await Promise.all(
    groupDetails.tfg_from_group_details.map(async (group) => {
      // ✅ Always fetch full form schema by form_slug
      const schema = await getFormWithSection({
        form_slug: group.slug,
      });

      return {
        slug: group.slug,
        title: group.title,
        form_id: group.form_id,
        schema,
      };
    }),
  );

  const schemaMap = formSchemas.reduce((acc, item) => {
    acc[item.slug] = item;
    return acc;
  }, {});

  return {
    ...groupDetails,
    tfg_from_group_details: groupDetails.tfg_from_group_details.map(
      (group) => ({
        ...group,
        [group.slug]: schemaMap[group.slug] || null,
      }),
    ),
  };
};

const getFormWithSection = async ({
  form_slug,
  section_slug,
  section_type,
}) => {
  let formDetails = null;
  try {
    const whereClause = [];
    const replacements = {};

    if (form_slug) {
      const normalizedSlug = form_slug.replace(/^monthely_/, "monthly_");
      whereClause.push("(f.slug = :slug OR f.slug = :normalized_slug)");
      replacements.slug = form_slug;
      replacements.normalized_slug = normalizedSlug;
    }

    if (section_slug) {
      whereClause.push("s.slug = :sec_slug");
      replacements.sec_slug = section_slug;
    }

    if (section_type) {
      whereClause.push("s.type = :sec_type");
      replacements.sec_type = section_type;
    }

    const sql = `
      SELECT
        f.*,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'section_id', s.section_id,
              'section_form_id', s.section_form_id,
              'section_label', s.section_label,
              'type', s.type,
              'slug', s.slug,
              'table', s."table",
              'primary_key', s.primary_key,
              'relation', s.relation,
              'context', s.context,
              'fields', s.fields
            )
            ORDER BY s.section_id
          ) FILTER (WHERE s.section_id IS NOT NULL),
          '[]'::jsonb
        ) AS sections
      FROM t_form f
      LEFT JOIN t_section s
        ON s.section_form_id = f.form_id
       AND s.is_active = TRUE
       AND s.deleted_at IS NULL
      ${whereClause.length ? `WHERE ${whereClause.join(" AND ")}` : ""}
      GROUP BY f.form_id
    `;

    const results = await sequelize.query(sql, {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    });
    formDetails = results[0] || null;
    if (formDetails) {
      const defaultApi = {
        add: "dynamic-form/add",
        edit: "dynamic-form/edit",
        details: "dynamic-form/details",
        list: "dynamic-form/general-list-view",
      };
      const defaultActions = [
        { slug: "add", name: "Add", label: "Add", type: "FORM" },
        { slug: "edit", name: "Edit", label: "Edit", type: "FORM" },
        { slug: "delete", name: "Delete", label: "Delete", type: "API" },
        { slug: "view", name: "View", label: "View", type: "FORM" },
      ];
      if (
        !formDetails.actions ||
        (Array.isArray(formDetails.actions) && formDetails.actions.length === 0)
      ) {
        formDetails.actions = defaultActions;
      }
    }
  } catch (error) {
    // Suppress pg "relation t_form does not exist" error
  }

  if (!formDetails && form_slug) {
    try {
      const masterSql = `
        SELECT name, slug, fields, table_name, label_field
        FROM t_master_schemas
        WHERE slug = :slug AND deleted_at IS NULL
        LIMIT 1
      `;
      const [master] = await sequelize.query(masterSql, {
        replacements: { slug: form_slug },
        type: sequelize.QueryTypes.SELECT,
      });

      if (master) {
        const fields = Array.isArray(master.fields) ? master.fields : JSON.parse(master.fields || "[]");
        const masterName = master.name || form_slug;
        const tableName = master.table_name || `t_mst_${form_slug}`;
        formDetails = {
          form_id: `mst_${master.slug}`,
          title: masterName,
          slug: master.slug,
          root_entity: {
            table: tableName,
            primary_key: "id",
          },
          context: {},
          api: {
            add: "dynamic-form/add",
            edit: "dynamic-form/edit",
            details: "dynamic-form/details",
            list: "dynamic-form/general-list-view",
          },
          actions: [
            {
              slug: "add",
              name: "Add",
              label: "Add",
              type: "FORM",
            },
            {
              slug: "edit",
              name: "Edit",
              label: "Edit",
              type: "FORM",
              form_details: {
                is_editable: true,
                is_active_key: "is_active",
              }
            },
            {
              slug: "delete",
              name: "Delete",
              label: "Delete",
              type: "API"
            }
          ],
          relation_with_parent: null,
          relation_with_children: [],
          is_active: true,
          sections: [
            {
              section_id: 1,
              section_form_id: `mst_${master.slug}`,
              section_label: masterName,
              type: "general",
              slug: master.slug,
              table: tableName,
              primary_key: "id",
              relation: null,
              context: {},
              fields: [
                {
                  column_name: "id",
                  db_field: "id",
                  type: "number",
                  label: "ID",
                  visible: false,
                  add_to_query: true,
                  add_to_list: false,
                },
                ...fields.map((f, i) => ({
                  column_name: f.column_name,
                  db_field: f.column_name,
                  type: f.type || "text",
                  label: f.label || f.column_name,
                  visible: true,
                  add_to_query: true,
                  add_to_list: true,
                })),
                {
                  column_name: "mst_created_at",
                  db_field: "mst_created_at",
                  type: "datetime",
                  label: "Created At",
                  visible: true,
                  add_to_query: true,
                  add_to_list: true,
                }
              ],
            }
          ]
        };
      }
    } catch (err) {
      console.error("[getFormWithSection] Fallback to t_master_schemas failed:", err.message);
    }
  }

  // Fallback 3: The URL slug (e.g. "rfp_list") may differ from the form slug.
  // Look up the menu by URL to find its module_key (the actual attached form slug),
  // then re-query t_form with that real slug.
  if (!formDetails && form_slug) {
    try {
      const menuLookup = await sequelize.query(
        `SELECT module_key FROM t_menus
         WHERE module_key IS NOT NULL
           AND module_key != ''
           AND deleted_at IS NULL
           AND (
             LOWER(url) LIKE :slug_pattern
             OR LOWER(url) = :slug_exact
             OR LOWER(module_key) = :slug_lower
           )
         LIMIT 1`,
        {
          replacements: {
            slug_pattern: `%/${form_slug.toLowerCase()}%`,
            slug_exact: `/${form_slug.toLowerCase()}`,
            slug_lower: form_slug.toLowerCase(),
          },
          type: sequelize.QueryTypes.SELECT,
        }
      );

      const resolvedFormSlug = menuLookup[0]?.module_key;
      if (resolvedFormSlug && resolvedFormSlug.toLowerCase() !== form_slug.toLowerCase()) {
        // Re-run the primary t_form query with the resolved slug
        const resolvedResults = await sequelize.query(
          `SELECT
            f.*,
            COALESCE(
              jsonb_agg(
                jsonb_build_object(
                  'section_id', s.section_id,
                  'section_form_id', s.section_form_id,
                  'section_label', s.section_label,
                  'type', s.type,
                  'slug', s.slug,
                  'table', s."table",
                  'primary_key', s.primary_key,
                  'relation', s.relation,
                  'context', s.context,
                  'fields', s.fields
                )
                ORDER BY s.section_id
              ) FILTER (WHERE s.section_id IS NOT NULL),
              '[]'::jsonb
            ) AS sections
          FROM t_form f
          LEFT JOIN t_section s
            ON s.section_form_id = f.form_id
           AND s.is_active = TRUE
           AND s.deleted_at IS NULL
          WHERE f.slug = :slug
          GROUP BY f.form_id`,
          {
            replacements: { slug: resolvedFormSlug },
            type: sequelize.QueryTypes.SELECT,
          }
        );
        formDetails = resolvedResults[0] || null;
        if (formDetails) {
          const defaultActions = [
            { slug: "add",    name: "Add",    label: "Add",    type: "FORM" },
            { slug: "edit",   name: "Edit",   label: "Edit",   type: "FORM" },
            { slug: "delete", name: "Delete", label: "Delete", type: "API"  },
            { slug: "view",   name: "View",   label: "View",   type: "FORM" },
          ];
          if (!formDetails.actions || (Array.isArray(formDetails.actions) && formDetails.actions.length === 0)) {
            formDetails.actions = defaultActions;
          }
        }
      }
    } catch (err) {
      console.error("[getFormWithSection] Menu module_key fallback failed:", err.message);
    }
  }

  return formDetails;
};

const getFormWithSectionForList = async ({
  form_slug,
  section_slug,
  section_type,
}) => {
  let row = null;
  try {
    const whereClause = [];
    const replacements = {};

    if (form_slug) {
      const normalizedSlug = form_slug.replace(/^monthely_/, "monthly_");
      whereClause.push("(f.slug = :slug OR f.slug = :normalized_slug)");
      replacements.slug = form_slug;
      replacements.normalized_slug = normalizedSlug;
    }

    if (section_slug) {
      whereClause.push("s.slug = :sec_slug");
      replacements.sec_slug = section_slug;
    }

    if (section_type) {
      whereClause.push("s.type = :sec_type");
      replacements.sec_type = section_type;
    }

    const sql = `
      SELECT
        f.form_id,
        f.title,
        f.slug,
        f.root_entity,
        f.context,
        f.api,
        f.actions,
        COALESCE((to_jsonb(f)->>'enable_action_tabs')::boolean, FALSE) AS enable_action_tabs,
        COALESCE(to_jsonb(f)->'action_tabs', '[]'::jsonb) AS action_tabs,
        COALESCE(to_jsonb(f)->>'parent_form_id', f.parent_form_id, (f.relation_with_parent->>'parent_form_id')) AS parent_form_id,
        pf.title AS parent_form_title,
        pf.slug AS parent_form_slug,
        f.relation_with_parent,
        f.relation_with_children,
        f.is_active,

        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'section_id', s.section_id,
              'section_form_id', s.section_form_id,
              'section_label', s.section_label,
              'type', s.type,
              'slug', s.slug,
              'table', s."table",
              'primary_key', s.primary_key,
              'relation', s.relation,
              'context', s.context,
              'fields', s.fields
            )
            ORDER BY s.created_at
          ) FILTER (WHERE s.section_id IS NOT NULL),
          '[]'::jsonb
        ) AS sections

      FROM t_form f
      LEFT JOIN t_form pf ON pf.form_id::text = f.parent_form_id::text
      LEFT JOIN t_section s
        ON s.section_form_id = f.form_id
       AND s.is_active = TRUE
       AND s.deleted_at IS NULL

      ${whereClause.length ? `WHERE ${whereClause.join(" AND ")}` : ""}
      GROUP BY f.form_id, pf.form_id
      LIMIT 1
    `;

    const results = await sequelize.query(sql, {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    });
    row = results[0] || null;
  } catch (error) {
    // Suppress check errors
  }

  if (!row && form_slug) {
    try {
      const masterSql = `
        SELECT msc_name, msc_slug, msc_fields, msc_table_name, msc_label_field
        FROM t_master_schemas
        WHERE msc_slug = :slug AND msc_deleted_at IS NULL
        LIMIT 1
      `;
      const [master] = await sequelize.query(masterSql, {
        replacements: { slug: form_slug },
        type: sequelize.QueryTypes.SELECT,
      });

      if (master) {
        const fields = Array.isArray(master.msc_fields) ? master.msc_fields : JSON.parse(master.msc_fields || "[]");
        row = {
          form_id: `mst_${master.msc_slug}`,
          title: master.msc_name,
          slug: master.msc_slug,
          root_entity: {
            table: master.msc_table_name,
            primary_key: "mst_id",
          },
          context: {},
          api: {},
          actions: [
            {
              slug: "add",
              label: "Add",
              type: "FORM",
            },
            {
              slug: "edit",
              label: "Edit",
              type: "FORM",
              form_details: {
                is_editable: true,
                is_active_key: "mst_is_active",
              }
            },
            {
              slug: "delete",
              label: "Delete",
              type: "API"
            }
          ],
          relation_with_parent: null,
          relation_with_children: [],
          is_active: true,
          sections: [
            {
              section_id: 1,
              section_form_id: `mst_${master.msc_slug}`,
              section_label: master.msc_name,
              type: "general",
              slug: master.msc_slug,
              table: master.msc_table_name,
              primary_key: "mst_id",
              relation: null,
              context: {},
              fields: [
                {
                  column_name: "mst_id",
                  db_field: "mst_id",
                  type: "number",
                  label: "ID",
                  visible: false,
                  add_to_query: true,
                  add_to_list: false,
                },
                ...fields.map((f, i) => ({
                  column_name: f.column_name,
                  db_field: f.column_name,
                  type: f.type || "text",
                  label: f.label || f.column_name,
                  visible: true,
                  add_to_query: true,
                  add_to_list: true,
                })),
                {
                  column_name: "mst_created_at",
                  db_field: "mst_created_at",
                  type: "datetime",
                  label: "Created At",
                  visible: true,
                  add_to_query: true,
                  add_to_list: true,
                }
              ],
            }
          ]
        };
      }
    } catch (err) {
      console.error("[getFormWithSectionForList] Fallback to t_master_schemas failed:", err.message);
    }
  }

  if (!row) return null;

  return {
    form_id: row.form_id,
    title: row.title,
    slug: row.slug,
    root_entity: row.root_entity,
    context: row.context,
    api: row.api,
    actions: row.actions,
    enable_action_tabs: row.enable_action_tabs,
    action_tabs: row.action_tabs,
    parent_form_id: row.parent_form_id,
    parent_form_title: row.parent_form_title || null,
    parent_form_slug: row.parent_form_slug || null,
    relation_with_parent: row.relation_with_parent,
    relation_with_children: row.relation_with_children,
    is_active: row.is_active,
    sections: row.sections || [],
  };
};

const getFormById = async (form_id) => {
  try {
    const sql = `
    SELECT
      form_id,
      title,
      slug,
      root_entity,
      context,
      api,
      actions,
      relation_with_parent,
      relation_with_children,
      is_active
    FROM t_form
    WHERE form_id = :form_id
      AND is_active = true
      AND deleted_at IS NULL
    LIMIT 1
  `;

    const result = await sequelize.query(sql, {
      replacements: { form_id },
      type: sequelize.QueryTypes.SELECT,
    });

    if (!result.length) return null;

    const row = result[0];

    return {
      form_id: row.form_id,
      title: row.title,
      slug: row.slug,
      root_entity: row.root_entity,
      context: row.context,
      api: row.api,
      actions: row.actions,
      relation_with_parent: row.relation_with_parent,
      relation_with_children: row.relation_with_children,
      is_active: row.is_active,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

const getSectionsByFormId = async (form_id) => {
  const sql = `
    SELECT
      section_id,
      section_form_id,
      section_label,
      type,
      slug,
      "table",
      primary_key,
      relation,
      context,
      fields,
      is_active
    FROM t_section
    WHERE section_form_id = :form_id
      AND is_active = true
      AND deleted_at IS NULL
    ORDER BY created_at ASC
  `;

  const result = await sequelize.query(sql, {
    replacements: { form_id },
    type: sequelize.QueryTypes.SELECT,
  });

  return result.map((row) => ({
    section_id: row.section_id,
    section_form_id: row.section_form_id,
    section_label: row.section_label,
    type: row.type,
    slug: row.slug,
    table: row.table,
    primary_key: row.primary_key,
    relation: row.relation,
    context: row.context,
    fields: row.fields || [],
    is_active: row.is_active,
  }));
};

async function decorateSchemaForFetchType(schema, type) {
  const decorated = {
    ...schema,
    sections: [...schema.sections],
  };

  /* =========================
     WITH PARENT
  ========================= */
  if (type === "with_parent" || type === "tree") {
    const rel = schema.relation_with_parent;

    if (rel) {
      const parentForm = await getFormById(rel.parent_form_id);
      if (parentForm) {
        const parentSections = await getSectionsByFormId(parentForm.form_id);

        decorated.sections.push({
          type: "general",
          table: parentForm.root_entity.table,
          primary_key: parentForm.root_entity.primary_key,

          // 🔑 FIX: explicit alias
          alias: `parent_${parentForm.slug}`,

          slug: parentForm.slug,
          relation: {
            type: "one_to_one",
            parent_key: rel.parent_primary_key,
            foreign_key: rel.child_foreign_key,
          },
          fields: parentSections
            .filter((s) => s.type === "general")
            .flatMap((s) => s.fields),
        });
      }
    }
  }

  /* =========================
     WITH CHILDREN
  ========================= */
  if (type === "with_children" || type === "tree") {
    const children = schema.relation_with_children || [];

    for (const childRel of children) {
      const childForm = await getFormById(childRel.child_form_id);
      if (!childForm) continue;

      const childSections = await getSectionsByFormId(childForm.form_id);

      decorated.sections.push({
        type: "general",
        table: childForm.root_entity.table,
        primary_key: childForm.root_entity.primary_key,

        // 🔑 FIX: explicit alias
        alias: `child_${childForm.slug}`,

        slug: childForm.slug,
        relation: {
          type: childRel.relation_type,
          parent_key: childRel.parent_primary_key,
          foreign_key: childRel.child_foreign_key,
        },
        fields: childSections
          .filter((s) => s.type === "general")
          .flatMap((s) => s.fields),
      });
    }
  }

  return decorated;
}
module.exports = {
  // getFormGroupDetails,
  getFormWithSection,
  getFormById,
  getSectionsByFormId,
  getFormWithSectionForList,
  decorateSchemaForFetchType,
  buildFormGroupData,
};
