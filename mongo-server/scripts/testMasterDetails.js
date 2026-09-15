require("dotenv").config();
const mongoose = require("mongoose");
const dynamicFormCtrl = require("../src/modules/dynamic-form/dynamicForm.controller");

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/dynamicform_db";

async function main() {
  await mongoose.connect(MONGO_URI);

  const req = {
    body: {
      master: "state",
      table_name: "state",
      label_key: "name",
    }
  };

  const res = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      console.log("=== masterDetails Response ===");
      console.log(JSON.stringify(data, null, 2));
    }
  };

  await dynamicFormCtrl.masterDetails(req, res);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
