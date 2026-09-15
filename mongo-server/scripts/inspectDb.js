require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/dynamicform_db";

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;

  // 1. Check forms
  const forms = await db.collection("forms").find({ deleted_at: null }).toArray();
  console.log("=== FORMS ===");
  forms.forEach(f => {
    console.log(`- Form: title="${f.title}", slug="${f.slug}", table_name="${f.table_name}", is_master=${f.is_master}`);
    (f.sections || []).forEach(s => {
      console.log(`  Section: label="${s.section_label}", slug="${s.slug}", fields count=${(s.fields||[]).length}`);
      (s.fields || []).forEach(fld => {
        console.log(`    Field: label="${fld.label}", db_field="${fld.db_field}", type="${fld.type}", data_source=`, JSON.stringify(fld.data_source || {}));
      });
    });
  });

  // 2. Check master schemas
  const masterSchemas = await db.collection("masterschemas").find({ deleted_at: null }).toArray();
  console.log("=== MASTER SCHEMAS ===");
  masterSchemas.forEach(m => {
    console.log(`- MasterSchema: name="${m.name}", slug="${m.slug}", label_field="${m.label_field}"`);
  });

  // 3. Check formdatas
  const formdatas = await db.collection("formdatas").find({ deleted_at: null }).toArray();
  console.log("=== FORMDATAS ===");
  formdatas.forEach(fd => {
    console.log(`- FormData: id=${fd._id}, form_slug="${fd.form_slug}", data=`, JSON.stringify(fd.data));
  });

  // 4. Check masterdatas
  const masterdatas = await db.collection("masterdatas").find({ deleted_at: null }).toArray();
  console.log("=== MASTERDATAS ===");
  masterdatas.forEach(md => {
    console.log(`- MasterData: id=${md._id}, master_slug="${md.master_slug}", data=`, JSON.stringify(md.data));
  });

  // 5. Check views / collections
  const collections = await db.listCollections().toArray();
  console.log("=== COLLECTIONS / VIEWS ===");
  collections.forEach(c => console.log(`- ${c.name} (${c.type || 'collection'})`));

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
