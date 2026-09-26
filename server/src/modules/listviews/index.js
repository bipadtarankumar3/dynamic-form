// const fs = require("fs");
// const path = require("path");

// const cache = {};

// function getListView(moduleName) {
//   if (cache[moduleName]) return cache[moduleName];

//   const filePath = path.join(__dirname, `${moduleName}.listview.json`);

//   if (!fs.existsSync(filePath)) {
//     throw new Error(`ListView config not found for module: ${moduleName}`);
//   }

//   const json = JSON.parse(fs.readFileSync(filePath, "utf8"));

//   cache[moduleName] = json.list_view;
//   return cache[moduleName];
// }

// module.exports = { getListView };

const fs = require("fs");
const path = require("path");

const cache = {};

function getListView(moduleName) {
  if (cache[moduleName]) return cache[moduleName];

  const filePath = path.join(__dirname, `${moduleName}.listview.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`ListView config not found for module: ${moduleName}`);
  }

  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));

  // ✅ STORE FULL JSON (IMPORTANT)
  cache[moduleName] = json;

  return cache[moduleName];
}

module.exports = { getListView };
