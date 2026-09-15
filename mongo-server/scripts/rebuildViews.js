require("dotenv").config();
const mongoose = require("mongoose");
const Form = require("../src/models/Form.model");
const DatabaseView = require("../src/models/DatabaseView.model");

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/dynamicform_db";

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB. Rebuilding all form views...");

  const forms = await Form.find({ deleted_at: null });
  console.log(`Found ${forms.length} forms.`);

  for (const form of forms) {
    const viewSlug = `v_${form.slug}`;
    const viewName = `${form.title} View`;

    const projectFields = {
      _id: 1,
      id: "$_id",
      form_slug: 1,
      created_at: 1,
      updated_at: 1,
      status: 1,
      created_by: 1,
      updated_by: 1,
      data: "$data",
    };

    // 1. Extract all field keys from sections
    (form.sections || []).forEach((sec) => {
      (sec.fields || []).forEach((fld) => {
        const key = fld.db_field || fld.column_name || fld.id;
        if (key && !projectFields[key]) {
          projectFields[key] = `$data.${key}`;
        }
      });
    });

    // 2. Extract from table_columns if defined
    (form.table_columns || []).forEach((col) => {
      if (!col.key || col.checked === false) return;
      if (col.key === "id") {
        projectFields["id"] = "$_id";
      } else if (["_id", "created_at", "updated_at", "status", "created_by", "updated_by", "form_slug"].includes(col.key)) {
        projectFields[col.key] = 1;
      } else if (!projectFields[col.key]) {
        projectFields[col.key] = `$data.${col.key}`;
      }
    });

    const pipeline = [
      { $match: { form_slug: form.slug, deleted_at: null } },
      { $project: projectFields },
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
      },
      { upsert: true, new: true }
    );

    console.log(`✅ View "${viewSlug}" created with projection:`, Object.keys(projectFields).join(", "));
  }

  // Verify v_state
  const v_state_docs = await mongoose.connection.db.collection("v_state").find({}).toArray();
  console.log("\n=== v_state docs now ===");
  console.log(JSON.stringify(v_state_docs, null, 2));

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
