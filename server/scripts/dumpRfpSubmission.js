const { sequelize } = require("../src/config/db.config");
const fs = require("fs");
const path = require("path");

async function dump() {
  const [forms] = await sequelize.query(`SELECT form_id, title, slug, root_entity, is_master, enable_approval, parent_form_id, view_name, view_slug FROM t_form WHERE slug = 'rfp_submission'`);
  const form = forms[0];
  const [sections] = await sequelize.query(`SELECT section_id, section_label, type, slug, "table", primary_key, relation, context, fields FROM t_section WHERE section_form_id = :form_id ORDER BY section_id ASC`, { replacements: { form_id: form.form_id } });
  form.sections = sections;
  fs.writeFileSync(path.join(__dirname, "rfp_submission_schema.json"), JSON.stringify(form, null, 2));
  console.log("Dumped rfp_submission_schema.json successfully!");
  process.exit(0);
}

dump().catch(console.error);
