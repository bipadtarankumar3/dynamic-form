// scripts/deleteState.js
// Run: node scripts/deleteState.js
require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/dynamicform_db";

async function main() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  console.log("🔍 Scanning for 'state' in database:", MONGO_URI);

  // ── 1. Form schema ────────────────────────────────────────────────────
  const Form = require("../src/models/Form.model");
  const stateForm = await Form.findOne({ slug: "state" });
  if (stateForm) {
    await Form.deleteOne({ _id: stateForm._id });
    console.log(`✅ Deleted Form schema: "${stateForm.title}" (slug=state)`);
  } else {
    console.log("ℹ️  No Form schema with slug=state");
  }

  // ── 2. Master schema ─────────────────────────────────────────────────
  const MasterSchema = require("../src/models/MasterSchema.model");
  const stateMaster = await MasterSchema.findOne({ slug: "state" });
  if (stateMaster) {
    await MasterSchema.deleteOne({ _id: stateMaster._id });
    console.log(`✅ Deleted Master schema: "${stateMaster.name}" (slug=state)`);
  } else {
    console.log("ℹ️  No Master schema with slug=state");
  }

  // ── 3. Form data records ──────────────────────────────────────────────
  const FormData = require("../src/models/FormData.model");
  const fdCount = await FormData.countDocuments({ form_slug: "state" });
  if (fdCount > 0) {
    await FormData.deleteMany({ form_slug: "state" });
    console.log(`✅ Deleted ${fdCount} form data record(s) for form_slug=state`);
  } else {
    console.log("ℹ️  No form data records for state");
  }

  // ── 4. Master data records ────────────────────────────────────────────
  const MasterData = require("../src/models/MasterData.model");
  const mdCount = await MasterData.countDocuments({ master_slug: "state" });
  if (mdCount > 0) {
    await MasterData.deleteMany({ master_slug: "state" });
    console.log(`✅ Deleted ${mdCount} master data record(s) for master_slug=state`);
  } else {
    console.log("ℹ️  No master data records for state");
  }

  // ── 5. DatabaseView metadata ──────────────────────────────────────────
  const DatabaseView = require("../src/models/DatabaseView.model");
  const viewsDeleted = await DatabaseView.deleteMany({
    $or: [{ view_slug: "v_state" }, { view_slug: "state" }, { base_collection: "state" }],
  });
  if (viewsDeleted.deletedCount > 0) {
    console.log(`✅ Deleted ${viewsDeleted.deletedCount} DatabaseView metadata record(s)`);
  } else {
    console.log("ℹ️  No DatabaseView metadata for state");
  }

  // ── 6. Drop actual MongoDB views (v_state, state) ────────────────────
  for (const viewName of ["v_state", "state"]) {
    try {
      const existing = await db.listCollections({ name: viewName }).toArray();
      if (existing.length > 0) {
        await db.dropCollection(viewName);
        console.log(`✅ Dropped MongoDB collection/view: "${viewName}"`);
      }
    } catch (e) {
      console.log(`⚠️  Could not drop "${viewName}":`, e.message);
    }
  }

  console.log("\n🎉 Done. State data has been fully removed.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
