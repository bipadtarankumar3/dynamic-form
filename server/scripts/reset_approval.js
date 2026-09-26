// server/scripts/reset_approval.js
// Usage: node server/scripts/reset_approval.js project 968
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const db = require("../src/config/db");

async function resetApproval(formSlug = "project", recordId = 968) {
  const recId = Number(recordId);
  const tableName = formSlug.startsWith("t_") ? formSlug : `t_frm_${formSlug}`;

  console.log(`\n========================================`);
  console.log(` Resetting approval data for: ${formSlug} #${recId}`);
  console.log(`========================================`);

  try {
    // 1. Delete workflow instance (single table)
    const wfi = await db.query(
      `DELETE FROM t_workflow_instances
        WHERE (record_table = $1 OR record_table = $2) AND record_id = $3`,
      [tableName, formSlug, recId]
    );
    console.log(`✓ Deleted workflow instances: ${wfi.rowCount}`);

    // 2. Delete approval process tracks
    const track = await db.query(
      `DELETE FROM t_approval_process_track
        WHERE apt_type = $1 AND apt_item_id = $2`,
      [formSlug, recId]
    );
    console.log(`✓ Deleted approval process track entries: ${track.rowCount}`);

    // 3. Delete notifications
    const notif = await db.query(
      `DELETE FROM t_notifications
        WHERE (ref_table = $1 OR ref_table = $2) AND ref_id = $3`,
      [tableName, formSlug, recId]
    );
    console.log(`✓ Deleted notifications: ${notif.rowCount}`);

    // 4. Reset form record status
    try {
      const proj = await db.query(
        `UPDATE ${tableName}
           SET status = 'Draft', updated_at = NOW()
         WHERE id = $1`,
        [recId]
      );
      console.log(`✓ Reset ${tableName} status to 'Draft': ${proj.rowCount}`);
    } catch (e) {
      console.log(`  (Note on ${tableName} status update: ${e.message})`);
    }

    console.log(`\n🎉 Done! ${formSlug} #${recId} is now ready for a fresh approval flow.\n`);
  } catch (err) {
    console.error("Error resetting approval:", err);
  } finally {
    process.exit(0);
  }
}

const formSlug = process.argv[2] || "project";
const recordId = process.argv[3] || 968;
resetApproval(formSlug, recordId);
