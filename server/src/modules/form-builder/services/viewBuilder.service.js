const SectionModel = require("../../../models/section.model");

const sanitize = (val = "") => val.toLowerCase().replace(/[^a-z0-9_]/g, "");

const getPostgresCastType = (type = "") => {
  switch (type.toLowerCase()) {
    case "int":
    case "integer":
      return "integer";

    case "float":
    case "double":
    case "decimal":
      return "double precision";

    case "boolean":
      return "boolean";

    case "date":
      return "date";

    case "json":
    case "jsonb":
      return "jsonb";

    case "text[]":
      return "text[]";

    default:
      return "text";
  }
};

const buildCreateViewSQL = async ({ transaction, form }) => {
  try {
    const formId = form.form_id;

    const sections = await SectionModel.findAll({
      where: {
        section_form_id: formId,
        is_active: true,
      },
      raw: true,
      order: [["section_id", "ASC"]],
      transaction,
    });

    if (!sections.length) {
      throw new Error("No sections found");
    }

    const rootSection = sections.find(
      (s) => !s.relation || s.relation === null,
    );

    if (!rootSection) {
      throw new Error("Root section not found");
    }

    const rootTable = rootSection.table;
    const rootPrimaryKey = rootSection.primary_key;

    const viewName = `v_${sanitize(form?.root_entity?.table)}`;

    const selectColumns = [];
    const joins = [];

    // ROOT PRIMARY KEY
    selectColumns.push(`${rootTable}."${rootPrimaryKey}" AS ${rootPrimaryKey}`);

    // LOOP SECTIONS
    for (const section of sections) {
      const tableName = section.table;
      const sectionType = section.type;
      const fields = section.fields || [];

      // =====================================
      // GENERAL SECTION
      // =====================================
      if (sectionType === "general") {
        // ADD JOIN FOR NON-ROOT GENERAL TABLES
        if (tableName !== rootTable) {
          const relation = section.relation;

          if (relation) {
            joins.push(`
        LEFT JOIN ${tableName}
        ON ${tableName}."${relation.foreign_key}"
        =
        ${rootTable}."${relation.parent_key}"
      `);
          }
        }

        for (const field of fields) {
          if (!field?.db_field) continue;

          if (field.type === "file") continue;

          // DATERANGE
          if (field.data_type === "daterange" && field.act_db_field) {
            if (field.act_db_field.start) {
              selectColumns.push(`
          ${tableName}."${field.act_db_field.start}"
        AS ${tableName}_${field.act_db_field.start}
        `);
            }

            if (field.act_db_field.end) {
              selectColumns.push(`
          ${tableName}."${field.act_db_field.end}"
          AS ${tableName}_${field.act_db_field.end}
        `);
            }

            continue;
          }

          const dbField = sanitize(field.db_field);

          selectColumns.push(
            ` ${tableName}."${dbField}" AS ${tableName}_${dbField} `,
          );
        }
      }

      // =====================================
      // ADD MORE SECTION
      // =====================================
      if (sectionType === "add_more") {
        const relation = section.relation;

        if (!relation) continue;

        const parentKey = relation.parent_key;
        const foreignKey = relation.foreign_key;

        const addMoreFields = [];

        for (const field of fields) {
          if (!field?.db_field) continue;

          if (field.type === "file") continue;

          // DATERANGE
          if (field.data_type === "daterange" && field.act_db_field) {
            if (field.act_db_field.start) {
              addMoreFields.push(`
                '${field.act_db_field.start}',
                ${tableName}."${field.act_db_field.start}"
              `);
            }

            if (field.act_db_field.end) {
              addMoreFields.push(`
                '${field.act_db_field.end}',
                ${tableName}."${field.act_db_field.end}"
              `);
            }

            continue;
          }

          const dbField = sanitize(field.db_field);

          addMoreFields.push(`
            '${dbField}',
            ${tableName}."${dbField}"
          `);
        }

        selectColumns.push(`
          (
            SELECT COALESCE(
              json_agg(
                json_build_object(
                  ${addMoreFields.join(",")}
                )
              ),
              '[]'::json
            )
            FROM ${tableName}
            WHERE ${tableName}."${foreignKey}"
            =
            ${rootTable}."${parentKey}"
          ) AS ${tableName}
        `);
      }
    }

    const sql = ` CREATE OR REPLACE VIEW ${viewName} AS SELECT ${selectColumns.join(",\n")} FROM ${rootTable} ${joins.join("\n")} `;

    return sql;
  } catch (error) {
    throw error;
  }
};
module.exports = {
  buildCreateViewSQL,
};
