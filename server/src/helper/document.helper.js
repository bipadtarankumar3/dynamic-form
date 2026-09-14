const storageService = require("../services/storage.service");

const STORAGE_DRIVER = (process.env.UPLOAD_STORAGE_DRIVER || "local").trim().toLowerCase();

/**
 * Saves a file to local disk or S3 depending on UPLOAD_STORAGE_DRIVER
 */
async function processFileStorage({ file, idx, folderPath, baseFolder, id }) {
  // Extract file buffer safely (or read from disk if file.path exists)
  let fileBuffer = file?.buffer;
  if (!fileBuffer && file?.path && fs.existsSync(file.path)) {
    try {
      fileBuffer = await fs.promises.readFile(file.path);
    } catch (e) {
      console.warn("[File Storage Warning] Could not read file.path:", e.message);
    }
  }

  // If there is no binary buffer/content to save (e.g. existing doc metadata or empty buffer), skip writing new file
  if (!fileBuffer && !file?.path) {
    const existingPath = file?.filePath || file?.file_path || file?.url || file?.path || "";
    const fileName = file?.filename || file?.file_name || file?.originalname || file?.name || `file_${idx + 1}`;
    return {
      fileName,
      filePath: existingPath.replace(/^uploads[\\/]/, "").replace(/\\/g, "/"),
      fileOriginalPath: existingPath.replace(/\\/g, "/"),
      s3Key: file?.s3_key || null,
      s3Bucket: file?.s3_bucket || null,
      skippedWrite: true,
    };
  }

  const cleanSubFolder = `${baseFolder.replace(/^uploads[\\/]/, "").replace(/^[/\\]+|[/\\]+$/g, "")}/${id}`.replace(/\\/g, "/");
  const uploadRes = await storageService.uploadFile({
    file: {
      ...file,
      buffer: fileBuffer,
    },
    folder: cleanSubFolder,
    finalDocId: id,
    docPurpose: file?.__field || file?.fieldname || file?.doc_purpose || "document",
    docTitle: file?.originalname || file?.name,
  });

  return {
    fileName: uploadRes.file_name,
    filePath: uploadRes.file_path,
    fileOriginalPath: uploadRes.file_path,
    s3Key: uploadRes.s3_key,
    s3Bucket: uploadRes.s3_bucket,
    tdocId: uploadRes.tdoc_id,
  };
}

const saveUpdateAndPrepareDocumentMetadata = async (
  files,
  id,
  baseFolder,
  createdBy,
  transaction
) => {
  const folderPath = path.join(baseFolder, id.toString());
  await fs.promises.mkdir(folderPath, { recursive: true });

  const filePaths = [];

  const metadata = await Promise.all(
    files.map(async (file, idx) => {
      const storageResult = await processFileStorage({
        file,
        idx,
        folderPath,
        baseFolder,
        id,
      });

      filePaths.push(storageResult.fileOriginalPath);

      const docPurpose = file?.__field || file?.fieldname || file?.doc_purpose || file?.fieldKey || file?.db_field || "document";

      // Check for existing document with same fieldName
      const existingDoc = await DocumentModel.findOne({
        where: {
          final_doc_id: parseInt(id, 10),
          doc_purpose: docPurpose,
        },
        transaction,
      });

      // Delete old local file if exists
      if (existingDoc && existingDoc.file_path) {
        const oldPath = path.join("uploads", existingDoc.file_path);
        try {
          await fs.promises.unlink(oldPath);
        } catch (err) {
          console.warn(`Old file not found or could not delete: ${oldPath}`);
        }
      }

      const docMetadata = {
        final_doc_id: parseInt(id, 10),
        doc_purpose: docPurpose,
        doc_title: file?.originalname || file?.name || file?.doc_title || storageResult.fileName,
        doc_type: file?.mimetype || file?.doc_type || "application/octet-stream",
        file_path: storageResult.filePath,
        file_name: storageResult.fileName,
        file_original_path: storageResult.fileOriginalPath,
        doc_ext: path.extname(storageResult.fileName || ""),
        s3_key: storageResult.s3Key,
        s3_bucket: storageResult.s3Bucket,
        created_by: createdBy,
      };

      if (existingDoc) {
        await existingDoc.update(
          { ...docMetadata, updated_by: createdBy, updated_at: new Date() },
          { transaction }
        );
        return null; // skip bulk insert
      }

      return docMetadata;
    })
  );

  return {
    metadata: metadata.filter(Boolean), // only new entries
    filePaths,
  };
};

const saveAndPrepareDocumentMetadata = async (
  files,
  id,
  baseFolder,
  createdBy,
  transaction
) => {
  const folderPath = path.join(baseFolder, id.toString());
  await fs.promises.mkdir(folderPath, { recursive: true });

  const filePaths = [];

  const metadata = await Promise.all(
    files.map(async (file, idx) => {
      const storageResult = await processFileStorage({
        file,
        idx,
        folderPath,
        baseFolder,
        id,
      });

      filePaths.push(storageResult.fileOriginalPath);

      const docPurpose = file?.__field || file?.fieldname || file?.doc_purpose || file?.fieldKey || file?.db_field || "document";

      return {
        final_doc_id: parseInt(id, 10),
        doc_purpose: docPurpose,
        doc_title: file?.originalname || file?.name || file?.doc_title || storageResult.fileName,
        doc_type: file?.mimetype || file?.doc_type || "application/octet-stream",
        file_path: storageResult.filePath,
        file_name: storageResult.fileName,
        file_original_path: storageResult.fileOriginalPath,
        doc_ext: path.extname(storageResult.fileName || ""),
        s3_key: storageResult.s3Key,
        s3_bucket: storageResult.s3Bucket,
        created_by: createdBy,
      };
    })
  );

  return {
    metadata,
    filePaths,
  };
};

const deleteDocumentById = async ({ documentId, transaction = null, user }) => {
  try {
    return await storageService.deleteFile({
      tdocId: documentId,
      userId: user?.user_id || 0,
    });
  } catch (error) {
    throw new Error(`Failed to delete document: ${error.message}`);
  }
};

module.exports = {
  saveUpdateAndPrepareDocumentMetadata,
  saveAndPrepareDocumentMetadata,
  deleteDocumentById,
};
