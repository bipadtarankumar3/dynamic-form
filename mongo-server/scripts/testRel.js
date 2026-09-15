require("dotenv").config();
const mongoose = require("mongoose");
const { getTableRelationships } = require("../src/modules/database-view/databaseView.controller");

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/dynamicform_db";

async function main() {
  await mongoose.connect(MONGO_URI);

  const req = { params: { tableName: "district" } };
  const res = {
    json: function(data) {
      console.log("=== getTableRelationships for 'district' ===");
      console.log(JSON.stringify(data, null, 2));
    }
  };

  await getTableRelationships(req, res);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
