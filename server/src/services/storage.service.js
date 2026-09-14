// server/src/services/storage.service.js
// Global file upload and storage service.
// Supports both 'local' disk storage and 's3' AWS storage, controlled by .env (UPLOAD_STORAGE_DRIVER).
// Automatically records and stores all file metadata in the t_documents table.

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const db = require("../config/db");

const STORAGE_DRIVER = (process.env.UPLOAD_STORAGE_DRIVER || "local").trim().toLowerCase();

/**
 * Uploads a single file to local storage or AWS S3 and creates a record in t_documents table.
 *
 * @param {Object} options
 * @param {Object} options.file - Multer file object or { buffer, originalname, mimetype, size, filename, path }
 * @param {string} [options.folder='documents'] - Destination subfolder (e.g. 'avatars', 'proposals', 'reports')
 * @param {number|string} [options.finalDocId=null] - Associated entity/document ID
 * @param {string} [options.docPurpose='upload'] - Document purpose tag or field identifier
 * @param {string} [options.docTitle] - Document display title (defaults to original file name)
 * @param {string} [options.remarks] - Any additional notes/remarks
 * @param {number|string} [options.createdBy=0] - User ID uploading the file
 * @returns {Promise<{ success: boolean, tdoc_id: string, file_path: string, file_name: string, s3_key: string|null, s3_bucket: string|null, storage_driver: string, document: Object }>}
 */
async function uploadFile({
  file,
  folder = "documents",
  finalDocId = null,
  docPurpose = "upload",
  docTitle = null,
  remarks = null,
  createdBy = 0,
}) {
  if (!file) {
    throw new Error("No file provided for upload");
  }

  // 1. Resolve binary buffer
  let fileBuffer = file.buffer;
  if (!fileBuffer && file.path && fs.existsSync(file.path)) {
    try {
      fileBuffer = await fs.promises.readFile(file.path);
    } catch (err) {
      console.warn("[Storage Service Warning] Could not read file from path:", err.message);
    }
  }

  const originalName = file.originalname || file.name || file.filename || "file";
  const fileExt = path.extname(originalName) || "";
  const mimeType = file.mimetype || "application/octet-stream";
  const cleanFolder = folder.replace(/^[/\\]+|[/\\]+$/g, ""); // strip leading/trailing slashes

  // 2. Generate unique file name
  const timestamp = Date.now();
  const randomSuffix = Math.round(Math.random() * 1e9);
  const baseName = path.basename(originalName, fileExt).replace(/[^a-zA-Z0-9_-]/g, "_");
  const uniqueFileName = `${baseName}-${timestamp}-${randomSuffix}${fileExt}`;

  let filePath = "";
  let s3Key = null;
  let s3Bucket = null;
  let activeDriver = "local";

  // 3. Handle AWS S3 Upload
  if (STORAGE_DRIVER === "s3") {
    const bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION || "us-east-1";
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (bucket && accessKeyId && secretAccessKey) {
      try {
        let S3Client, PutObjectCommand;
        try {
          const s3Sdk = require("@aws-sdk/client-s3");
          S3Client = s3Sdk.S3Client;
          PutObjectCommand = s3Sdk.PutObjectCommand;
        } catch (sdkErr) {
          throw new Error(`@aws-sdk/client-s3 is not available: ${sdkErr.message}`);
        }

        const s3 = new S3Client({
          region,
          credentials: { accessKeyId, secretAccessKey },
        });

        const key = `${cleanFolder}/${uniqueFileName}`;

        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: fileBuffer || (file.path ? fs.createReadStream(file.path) : Buffer.from("")),
            ContentType: mimeType,
          })
        );

        s3Key = key;
        s3Bucket = bucket;
        activeDriver = "s3";

        // Construct S3 public/accessible URL or standard key path
        filePath = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
      } catch (s3Err) {
        console.warn("[Storage Service S3 Warning] S3 upload failed, falling back to local storage:", s3Err.message);
      }
    } else {
      console.warn("[Storage Service Notice] S3 driver requested but AWS credentials/bucket missing. Falling back to local storage.");
    }
  }

  // 4. Handle Local Disk Upload (Default or fallback)
  if (!s3Key) {
    const rootUploadsDir = path.join(__dirname, "../../uploads");
    const targetDir = path.join(rootUploadsDir, cleanFolder);
    await fs.promises.mkdir(targetDir, { recursive: true });

    const localAbsolutePath = path.join(targetDir, uniqueFileName);

    if (fileBuffer) {
      await fs.promises.writeFile(localAbsolutePath, fileBuffer);
    } else if (file.path && fs.existsSync(file.path) && file.path !== localAbsolutePath) {
      // Copy or move file to target directory
      try {
        await fs.promises.copyFile(file.path, localAbsolutePath);
        // Clean up temp multer file if different
        await fs.promises.unlink(file.path).catch(() => {});
      } catch (copyErr) {
        console.warn("[Storage Service Warning] Could not copy temp file:", copyErr.message);
      }
    }

    activeDriver = "local";
    // Standard relative URL served by Express static files route (/api/v1/static)
    filePath = `/api/v1/static/${cleanFolder}/${uniqueFileName}`;
  }

  // 5. Store record in t_documents table
  const title = docTitle || originalName;
  const parsedFinalDocId = finalDocId ? parseInt(finalDocId, 10) : null;
  const userId = createdBy ? parseInt(createdBy, 10) : 0;

  const insertQuery = `
    INSERT INTO t_documents (
      final_doc_id,
      doc_title,
      doc_type,
      file_path,
      file_name,
      file_original_path,
      remarks,
      doc_ext,
      doc_purpose,
      s3_key,
      s3_bucket,
      created_by,
      updated_by,
      created_at,
      updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12, NOW(), NOW()
    )
    RETURNING *;
  `;

  const values = [
    parsedFinalDocId,
    title,
    mimeType,
    filePath,
    uniqueFileName,
    originalName,
    remarks,
    fileExt,
    docPurpose,
    s3Key,
    s3Bucket,
    userId,
  ];

  const result = await db.query(insertQuery, values);
  const docRecord = result.rows[0];

  return {
    success: true,
    tdoc_id: docRecord?.tdoc_id,
    file_path: filePath,
    file_name: uniqueFileName,
    s3_key: s3Key,
    s3_bucket: s3Bucket,
    storage_driver: activeDriver,
    document: docRecord,
  };
}

/**
 * Uploads multiple files and creates records in t_documents table.
 *
 * @param {Object} options
 * @param {Array<Object>} options.files - Array of Multer file objects
 * @param {string} [options.folder='documents']
 * @param {number|string} [options.finalDocId=null]
 * @param {string} [options.docPurpose='upload']
 * @param {number|string} [options.createdBy=0]
 * @returns {Promise<Array<Object>>}
 */
async function uploadMultipleFiles({
  files = [],
  folder = "documents",
  finalDocId = null,
  docPurpose = "upload",
  createdBy = 0,
}) {
  if (!Array.isArray(files) || files.length === 0) {
    return [];
  }

  const uploadResults = [];
  for (const file of files) {
    const res = await uploadFile({
      file,
      folder,
      finalDocId,
      docPurpose: file?.__field || file?.fieldname || docPurpose,
      docTitle: file.originalname,
      createdBy,
    });
    uploadResults.push(res);
  }
  return uploadResults;
}

/**
 * Deletes a file from storage (Local Disk or AWS S3) and soft deletes the record in t_documents table.
 *
 * @param {Object} options
 * @param {string} options.tdocId - tdoc_id from t_documents
 * @param {number|string} [options.userId=0] - User performing delete
 * @returns {Promise<boolean>}
 */
async function deleteFile({ tdocId, userId = 0 }) {
  if (!tdocId) return false;

  const docRes = await db.query(
    `SELECT * FROM t_documents WHERE tdoc_id = $1 AND deleted_at IS NULL LIMIT 1`,
    [tdocId]
  );

  if (docRes.rows.length === 0) {
    return false;
  }

  const doc = docRes.rows[0];

  // 1. Delete from S3 if s3_key is present
  if (doc.s3_key) {
    const bucket = doc.s3_bucket || process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION || "us-east-1";
    if (bucket && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      try {
        const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
        const s3 = new S3Client({
          region,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
        });
        await s3.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: doc.s3_key,
          })
        );
      } catch (err) {
        console.warn(`[Storage Service Warning] Could not delete S3 object ${doc.s3_key}:`, err.message);
      }
    }
  }

  // 2. Delete local file if present
  if (doc.file_path && !doc.s3_key) {
    const cleanRelativePath = doc.file_path.replace(/^\/api\/v1\/static\/?/, "").replace(/^uploads\/?/, "");
    const localAbsolutePath = path.join(__dirname, "../../uploads", cleanRelativePath);
    try {
      if (fs.existsSync(localAbsolutePath)) {
        await fs.promises.unlink(localAbsolutePath);
      }
    } catch (err) {
      console.warn(`[Storage Service Warning] Could not delete local file ${localAbsolutePath}:`, err.message);
    }
  }

  // 3. Soft delete in t_documents
  await db.query(
    `UPDATE t_documents SET deleted_at = NOW(), updated_by = $1 WHERE tdoc_id = $2`,
    [userId, tdocId]
  );

  return true;
}

module.exports = {
  uploadFile,
  uploadMultipleFiles,
  deleteFile,
};
