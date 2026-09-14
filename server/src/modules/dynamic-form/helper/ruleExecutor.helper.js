const { sequelize } = require("../../../config/db.config");
 
/* =========================
   ERROR BAG CREATOR
========================= */
function createErrorBag() {
  return {
    global: {},
  };
}
 
/* =========================
   ADD ERROR (SMART)
========================= */
function addError(errorBag, section, message, rowIndex = null, dbField = null) {
  /* GLOBAL */
  if (!section?.section_id) {
    errorBag.global ||= {};
    errorBag.global._error = message;
    return;
  }
 
  const sectionId = section.section_id;
  errorBag[sectionId] ||= {};
 
  /* GENERAL */
  if (section.type === "general") {
    const key = dbField || "_error";
    errorBag[sectionId][key] = message;
    return;
  }
 
  /* ADD_MORE → FLAT KEYS */
  if (section.type === "add_more") {
    const key = `${rowIndex}_${dbField || "_error"}`;
    errorBag[sectionId][key] = message;
  }
}
 
/* =========================
   UNIQUE RULE
========================= */
async function checkUniqueRule({
  section,
  row,
  transaction,
  errorBag,
  mode = "add",
  rowIndex = null,
}) {
  for (const field of section.fields || []) {
    const rule = field.rules?.unique;
    if (!rule?.enabled) continue;
 
    let value = row[field.db_field];
    if (value === null || value === undefined) continue;
    // if (typeof value === "string") {
      value = String(value).trim().toLowerCase(); // ✅ normalize input
    // }
    if (!value) continue;
 
    // 🔥 lowercase + trim DB column
    let where = [`LOWER(TRIM(${field.db_field})) = :val`];
    let replacements = { val: value };
 
    /* COMPOSITE SCOPE SUPPORT */
    if (Array.isArray(rule.scope)) {
      for (const scopeField of rule.scope) {
        let scopeVal = row[scopeField];
        if (scopeVal === null || scopeVal === undefined) continue;
        // if (typeof scopeVal === "string") {
          scopeVal = String(scopeVal).trim().toLowerCase();
        // }
        if (!scopeVal) continue;
 
        where.push(`LOWER(TRIM(${scopeField})) = :${scopeField}`);
        replacements[scopeField] = scopeVal;
      }
    }
 
    /* EDIT MODE → exclude self */
    if (mode === "edit" && row[section.primary_key]) {
      where.push(`${section.primary_key} != :pk`);
      replacements.pk = row[section.primary_key];
    }
 
    const sql = `
      SELECT 1
      FROM ${section.table}
      WHERE ${where.join(" AND ")}
      LIMIT 1
    `;
 
    const [rows] = await sequelize.query(sql, {
      replacements,
      transaction,
    });
 
    if (rows.length > 0) {
      addError(
        errorBag,
        section,
        `${field.label || field.db_field} already exists`,
        rowIndex,
        field.db_field
      );
    }
  }
}
 
/* =========================
   EXECUTE RULES (MAIN)
========================= */
async function executeRules({
  schema,
  segregatedData,
  transaction,
  mode = "add",
}) {
  const errorBag = createErrorBag();
 
  for (const section of schema.sections) {
    const sectionData = segregatedData[section.table];
    if (!sectionData) continue;
 
    // GENERAL
    if (section.type === "general") {
      await checkUniqueRule({
        section,
        row: sectionData,
        transaction,
        errorBag,
        mode,
      });
    }
 
    // ADD_MORE
    if (section.type === "add_more" && Array.isArray(sectionData)) {
      for (let i = 0; i < sectionData.length; i++) {
        await checkUniqueRule({
          section,
          row: sectionData[i],
          transaction,
          errorBag,
          mode,
          rowIndex: i,
        });
      }
    }
  }
 
  return errorBag;
}
 
/* =========================
   HAS ERRORS?
========================= */
function hasErrors(errorBag) {
  return (
    Object.keys(errorBag.global).length > 0 ||
    Object.keys(errorBag).some(
      (k) => k !== "global" && errorBag[k]?.length !== 0
    )
  );
}
 
module.exports = {
  executeRules,
  hasErrors,
};