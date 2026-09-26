// server/src/modules/dynamic-form/hooks/examples/projectHooks.example.js
// ============================================================
// EXAMPLE: Backend Hook — How extra__ fields from the frontend
// are received and saved to a custom table via onAfterInsert.
//
// Register in your server startup or a dedicated hook loader file.
// ============================================================

const db = require("../../../../config/db");
const { registerBackendHook } = require("../backendHookRegistry");

/**
 * Example: Save extra hook-injected fields for "project" form
 * into a custom table t_frm_project_extra_metadata
 */
registerBackendHook("project", {
  /**
   * onAfterInsert is triggered after the main project row is inserted.
   *
   * Context:
   *  - insertedId   : the new project's primary key (e.g. 42)
   *  - payload      : the main form data that was inserted
   *  - extraFields  : { gst_number: "27AABCU9603R1ZX", org_category: "ngo" }
   *                   (from the hook component's getData() → submitted as extra__gst_number etc.)
   *  - req          : Express request object
   */
  onAfterInsert: async ({ insertedId, payload, extraFields, req }) => {
    if (!extraFields || Object.keys(extraFields).length === 0) return;

    // Ensure the custom metadata table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS t_frm_project_extra_metadata (
        id          SERIAL PRIMARY KEY,
        project_id  INT NOT NULL,
        gst_number  VARCHAR(50),
        org_category VARCHAR(50),
        created_at  TIMESTAMP DEFAULT NOW(),
        updated_at  TIMESTAMP DEFAULT NOW()
      )
    `);

    // Upsert the extra fields for this project
    await db.query(`
      INSERT INTO t_frm_project_extra_metadata (project_id, gst_number, org_category)
      VALUES ($1, $2, $3)
      ON CONFLICT (project_id)
      DO UPDATE SET
        gst_number   = EXCLUDED.gst_number,
        org_category = EXCLUDED.org_category,
        updated_at   = NOW()
    `, [
      insertedId,
      extraFields.gst_number  || null,
      extraFields.org_category || null
    ]);

    console.log(`[Hook: project.onAfterInsert] Extra fields saved for project #${insertedId}:`, extraFields);
  },

  /**
   * onAfterUpdate — same pattern for edit mode
   */
  onAfterUpdate: async ({ updatedId, payload, extraFields, req }) => {
    if (!extraFields || Object.keys(extraFields).length === 0) return;

    await db.query(`
      UPDATE t_frm_project_extra_metadata
      SET gst_number = $1, org_category = $2, updated_at = NOW()
      WHERE project_id = $3
    `, [extraFields.gst_number || null, extraFields.org_category || null, updatedId]);

    console.log(`[Hook: project.onAfterUpdate] Extra fields updated for project #${updatedId}:`, extraFields);
  }
});
