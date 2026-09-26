const fs = require("fs");

function imageToDataURI(filePath, mimeType = "image/png") {
  const imageBuffer = fs.readFileSync(filePath);
  const base64 = imageBuffer.toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

module.exports = { imageToDataURI };
