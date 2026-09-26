const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");

function renderTemplate(templateName, data) {
  try {
    const templatePath = path.join(__dirname, "hbs", `${templateName}.hbs`);
    const templateSource = fs.readFileSync(templatePath, "utf8");
    const template = handlebars.compile(templateSource);

    return template(data);
  } catch (err) {
    throw err;
  }
}

module.exports = { renderTemplate };
