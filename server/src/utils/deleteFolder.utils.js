const fs = require("fs/promises");
const fsSync = require("fs"); // for existsSync
const path = require("path");

async function deleteFolder(folderPath) {
  try {
    if (!fsSync.existsSync(folderPath)) {
      return;
    }

    await fs.rm(folderPath, { recursive: true, force: true });
  } catch (error) {
    throw new Error(`Error deleting folder ${folderPath}: ${error.message}`);
  }
}

module.exports = { deleteFolder };
