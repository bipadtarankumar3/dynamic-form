require("dotenv").config();
const mongoose = require("mongoose");
const dynamicFormCtrl = require("../src/modules/dynamic-form/dynamicForm.controller");

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/dynamicform_db";

async function main() {
  await mongoose.connect(MONGO_URI);

  const req = {
    body: {
      form_slug: "district",
      filters: {},
      pagination: { current_page: 1, page_size: 10 },
    }
  };

  const res = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      console.log("=== generalListView District Response ===");
      console.log("Rows count:", data.rows?.length);
      console.log("First row:", JSON.stringify(data.rows?.[0], null, 2));
    }
  };

  await dynamicFormCtrl.generalListView(req, res);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
