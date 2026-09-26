const BASE_URL = process.env.BASE_URL || "http://localhost:3003/files/";
function buildSelectQueryById({ schema, selected_data = {} }) {
  const rootTable = schema?.root_entity?.table;
  const rootPK = schema?.root_entity?.primary_key;
  const replacements = {};
  const select = [`r.${rootPK}`];
  const joins = [];
  const documentAggs = [];
  const searchColumns = [];
  const whereClause = [];

  schema.sections.forEach((section) => {
    const sectionAlias =
      section?.table === rootTable ? "r" : section?.section_id;

    /* ==========================
       GENERAL SECTION (UNCHANGED)
    ========================== */
    if (section?.type === "general") {
      /* ---------- ONE TO ONE JOIN ---------- */
      if (
        section?.table !== rootTable &&
        section?.relation?.type === "one_to_one"
      ) {
        select.push(`${sectionAlias}.${section?.primary_key}`);

        joins.push(`
          LEFT JOIN ${section?.table} ${sectionAlias}
            ON ${sectionAlias}.${section?.relation?.foreign_key}
               = r.${section?.relation?.parent_key}
        `);
      }

      section?.fields?.forEach((f) => {        
        if (f?.visible === false && f?.add_to_query !== true) return;
        if (f?.type === "file" && f?.file) {
          /* ---------- FILE FIELD ---------- */
          const doc = f?.file;

          documentAggs.push(`
            SELECT
              '${f.db_field}' AS db_field,
              COALESCE(
                jsonb_agg(
                  jsonb_build_object(
                    '${doc.primary_key}', d.${doc.primary_key},
                    '${doc.doc_type_key}', d.${doc.doc_type_key},
                    '${doc.file_path_key}', CONCAT('${BASE_URL}', d.${doc.file_path_key}),
                    '${doc.file_name_key}', d.${doc.file_name_key}
                  )
                  ORDER BY d.created_at
                ),
                '[]'::jsonb
              ) AS docs
            FROM ${doc.table} d
            WHERE d.${doc.foreign_key} = ${sectionAlias}.${section.primary_key}
              AND d.${doc.doc_type_key} = '${f.db_field}'
          `);
          return;
        }

        /* ---------- MULTIPLE MASTER ---------- */
        if (
          f.multiple &&
          f.data_source?.type === "master" &&
          f.type === "select"
        ) {
          const m = f.data_source;
          const cleanLabel = (m.label_key || "name").includes(".") ? m.label_key.split(".").pop() : (m.label_key || "name");

          if (!m.table_name) {
            select.push(`${sectionAlias}.${f.db_field}`);
            return;
          }

          select.push(`
            (
              SELECT COALESCE(
                jsonb_agg(
                  jsonb_build_object(
                    'label', mm.${cleanLabel},
                    'value', mm.${m.primary_key || 'id'}
                  )
                  ORDER BY mm.${m.primary_key || 'id'}
                ),
                '[]'::jsonb
              )
              FROM ${m.table_name} mm
              WHERE CASE
                WHEN jsonb_typeof(to_jsonb(${sectionAlias}.${f.db_field})) = 'array' THEN 
                  to_jsonb(${sectionAlias}.${f.db_field}) @> to_jsonb(mm.${m.primary_key || 'id'}) OR to_jsonb(${sectionAlias}.${f.db_field}) @> to_jsonb(CAST(mm.${m.primary_key || 'id'} AS TEXT))
                ELSE 
                  CAST(mm.${m.primary_key || 'id'} AS TEXT) = CAST(${sectionAlias}.${f.db_field} AS TEXT)
              END
            ) AS ${cleanLabel}_${f.db_field}
          `);

          select.push(`${sectionAlias}.${f.db_field}`);
          return;
        }

        /* ---------- MASTER ---------- */
        if (f.data_source?.type === "master" && f.type === "select") {
          select.push(`${sectionAlias}.${f.db_field}`);
          return;
        }

        /* ---------- DATE RANGE ---------- */
        if (f.type === "date_range") {
          if (f.act_db_field?.start && f.act_db_field?.end) {
            select.push(`${sectionAlias}.${f.act_db_field.start}`);
            select.push(`${sectionAlias}.${f.act_db_field.end}`);
            searchColumns.push(`${sectionAlias}.${f.act_db_field.start}`);
            searchColumns.push(`${sectionAlias}.${f.act_db_field.end}`);
          } else if (f.db_field) {
            select.push(`${sectionAlias}.${f.db_field}`);
            searchColumns.push(`${sectionAlias}.${f.db_field}`);
          }
          return;
        }

        /* ---------- NORMAL ---------- */
        if (f.db_field) {
          select.push(`${sectionAlias}.${f.db_field}`);
          searchColumns.push(`${sectionAlias}.${f.db_field}`);
        }
      });
    }

    /* ==========================
       ADD MORE SECTION (JSONB AGG)
    ========================== */
    const relObj = typeof section.relation === "string" ? JSON.parse(section.relation || "{}") : (section.relation || {});
    if (
      section.type === "add_more" &&
      (relObj.type === "one_to_many" || relObj.foreign_key)
    ) {
      const childAlias = section.section_id;
      const rowSelect = [];
      const rowJoins = [];
      const rowDocAggs = [];
      rowSelect.push(
        `'${section.primary_key}', ${childAlias}.${section.primary_key}`
      );
      section.fields.forEach((f) => {
        if (f?.visible === false && f?.add_to_query !== true) return;
        /* ---------- FILE ---------- */
        if (f.type === "file" && f.file) {
          const doc = f.file;

          rowDocAggs.push(`
            SELECT
              '${f.db_field}' AS db_field,
              COALESCE(
                jsonb_agg(
                  jsonb_build_object(
                    '${doc.primary_key}', d.${doc.primary_key},
                    '${doc.doc_type_key}', d.${doc.doc_type_key},
                    '${doc.file_path_key}', CONCAT('${BASE_URL}', d.${doc.file_path_key}),
                    '${doc.file_name_key}', d.${doc.file_name_key}
                  )
                  ORDER BY d.created_at
                ),
                '[]'::jsonb
              ) AS docs
            FROM ${doc.table} d
            WHERE d.${doc.foreign_key} = ${childAlias}.${section.primary_key}
              AND d.${doc.doc_type_key} = '${f.db_field}'
          `);
          return;
        }

        /* ---------- MULTIPLE MASTER ---------- */
        if (
          f.multiple &&
          f.data_source?.type === "master" &&
          f.type === "select"
        ) {
          const m = f.data_source;
          const cleanLabel = (m.label_key || "name").includes(".") ? m.label_key.split(".").pop() : (m.label_key || "name");

          if (!m.table_name) {
            rowSelect.push(`'${f.db_field}', ${childAlias}.${f.db_field}`);
            return;
          }

          rowSelect.push(`
            '${f.db_field}', (
              SELECT COALESCE(
                jsonb_agg(
                  jsonb_build_object(
                    'label', mm.${cleanLabel},
                    'value', mm.${m.primary_key || 'id'}
                  )
                ),
                '[]'::jsonb
              )
              FROM ${m.table_name} mm
              WHERE CASE
                WHEN jsonb_typeof(to_jsonb(${childAlias}.${f.db_field})) = 'array' THEN 
                  to_jsonb(${childAlias}.${f.db_field}) @> to_jsonb(mm.${m.primary_key || 'id'}) OR to_jsonb(${childAlias}.${f.db_field}) @> to_jsonb(CAST(mm.${m.primary_key || 'id'} AS TEXT))
                ELSE 
                  CAST(mm.${m.primary_key || 'id'} AS TEXT) = CAST(${childAlias}.${f.db_field} AS TEXT)
              END
            )
          `);
          return;
        }

        /* ---------- MASTER ---------- */
        if (f.data_source?.type === "master" && f.type === "select") {
          rowSelect.push(`'${f.db_field}', ${childAlias}.${f.db_field}`);
          return;
        }

        /* ---------- DATE RANGE ---------- */
        if (f.type === "date_range") {
          if (f.act_db_field?.start && f.act_db_field?.end) {
            rowSelect.push(
              `'${f.act_db_field.start}', ${childAlias}.${f.act_db_field.start}`,
              `'${f.act_db_field.end}', ${childAlias}.${f.act_db_field.end}`
            );
          } else if (f.db_field) {
            rowSelect.push(`'${f.db_field}', ${childAlias}.${f.db_field}`);
          }
          return;
        }

        /* ---------- NORMAL ---------- */
        if (f.db_field) {
          rowSelect.push(`'${f.db_field}', ${childAlias}.${f.db_field}`);
        }
      });

      /* ---------- FILE MERGE ---------- */
      if (rowDocAggs.length) {
        rowSelect.push(`
          'documents', (
            SELECT COALESCE(
              jsonb_object_agg(db_field, docs),
              '{}'::jsonb
            )
            FROM (
              ${rowDocAggs.join("\nUNION ALL\n")}
            ) d
          )
        `);
      }

      /* ---------- FINAL JSONB AGG ---------- */
      select.push(`
        (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                ${rowSelect.join(",\n")}
              )
              ORDER BY ${childAlias}.${section.primary_key}
            ),
            '[]'::jsonb
          )
          FROM ${section.table} ${childAlias}
          ${rowJoins.join("\n")}
          WHERE ${childAlias}.${relObj.foreign_key || "parent_id"}
                = r.${relObj.parent_key || rootPK}
        ) AS ${section.slug}
      `);
    }
  });

  /* ==========================
     GLOBAL DOCUMENT MERGE (GENERAL)
  ========================== */
  if (documentAggs.length) {
    select.push(`
      (
        SELECT COALESCE(
          jsonb_object_agg(db_field, docs),
          '{}'::jsonb
        )
        FROM (
          ${documentAggs.join("\nUNION ALL\n")}
        ) file_docs
      ) AS documents
    `);
  }
  whereClause.push(`r.${rootPK} = :${rootPK}`);
  replacements[`${rootPK}`] = selected_data[rootPK];

  return {
    sql: `
     SELECT
      ${select.join(",\n")}
    FROM ${rootTable} r
    ${joins.join("\n")}
    WHERE ${whereClause.join(" AND ")}
  `,
    replacements,
  };
}

module.exports = {
  buildSelectQueryById,
};
