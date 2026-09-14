const sanitize = (val = "") => val.toLowerCase().replace(/[^a-z0-9_]/g, "");

const allowedTypes = ["varchar(255)", "int", "date", "jsonb", "text"];

const generateFieldColumns = (fields = []) => {
  const columns = [];

  for (const f of fields) {
    // ❌ skip invalid
    if (!f?.db_field || f.data_type === "file" ) continue;

    // 🔥 DATERANGE
    if (f.data_type === "daterange") {
      if (!f.act_db_field?.start || !f.act_db_field?.end) continue;

      columns.push(`"${sanitize(f.act_db_field.start)}" date`);
      columns.push(`"${sanitize(f.act_db_field.end)}" date`);
      continue;
    }

    // 🔒 sanitize
    const columnName = sanitize(f.db_field);

    // 🔒 validate type
    const type = allowedTypes.includes(f.data_type)
      ? f.data_type
      : "varchar(255)";

    columns.push(`"${columnName}" ${type}`);
  }

  return columns.join(",\n");
};

const buildCreateTableSQL = ({
  tableName,
  primaryKey,
  fieldColumns,
  isRoot,
  rootTable,
  rootPrimaryKey,
}) => {
  if (isRoot) {
    return `
      CREATE TABLE IF NOT EXISTS "${tableName}" (
        "${primaryKey}" BIGSERIAL PRIMARY KEY,
        "project_id" VARCHAR(255),
        wkb_geometry geometry,
        latitude double precision,
        longitude double precision,
        ${fieldColumns || ""}
        ${fieldColumns ? "," : ""}
        "created_by" INT,
        "updated_by" INT,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
  }

  return `
    CREATE TABLE IF NOT EXISTS "${tableName}" (
      "${primaryKey}" BIGSERIAL  PRIMARY KEY,
      "${rootPrimaryKey}" BIGINT,
      ${fieldColumns || ""}
      ${fieldColumns ? "," : ""}
      "created_by" INT,
      "updated_by" INT,
      "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT fk_${tableName}_${rootTable}
      FOREIGN KEY ("${rootPrimaryKey}")
      REFERENCES "${rootTable}"("${rootPrimaryKey}")
    );
  `;
};

module.exports = {
  generateFieldColumns,
  buildCreateTableSQL,
};
