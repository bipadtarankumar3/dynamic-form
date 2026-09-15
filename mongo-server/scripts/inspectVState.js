require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/dynamicform_db";

async function main() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const v_state_docs = await db.collection("v_state").find({}).toArray();
  console.log("=== v_state docs ===");
  console.log(JSON.stringify(v_state_docs, null, 2));

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
