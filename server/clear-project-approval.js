const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./src/config/db');

async function clearApprovalData(recordId = 968, formSlug = 'project') {
  try {
    console.log(`=== Clearing Approval Data for ${formSlug} (ID: ${recordId}) ===\n`);

    // 1. Delete workflow instances
    const delWfi = await db.query(
      `DELETE FROM t_workflow_instances 
       WHERE (record_table = $1 OR record_table = $2) AND record_id = $3`,
      [formSlug, `t_frm_${formSlug}`, Number(recordId)]
    );
    console.log(`✓ Deleted ${delWfi.rowCount} row(s) from t_workflow_instances`);

    // 2. Delete approval track
    const delApt = await db.query(
      `DELETE FROM t_approval_process_track 
       WHERE (apt_type = $1 OR apt_type = $2) AND apt_item_id = $3`,
      [formSlug, `t_frm_${formSlug}`, Number(recordId)]
    );
    console.log(`✓ Deleted ${delApt.rowCount} row(s) from t_approval_process_track`);

    // 3. Delete notifications
    const delNotif = await db.query(
      `DELETE FROM t_notifications 
       WHERE (ref_table = $1 OR ref_table = $2 OR link LIKE $3) AND (ref_id = $4 OR link LIKE $3)`,
      [formSlug, `t_frm_${formSlug}`, `%${recordId}%`, Number(recordId)]
    );
    console.log(`✓ Deleted ${delNotif.rowCount} row(s) from t_notifications`);

    // 4. Inspect columns of t_frm_project
    const colsRes = await db.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 't_frm_project'`
    );
    const cols = colsRes.rows.map(r => r.column_name);
    console.log(`Columns in t_frm_project:`, cols);

    // 5. Reset status
    let updateFields = [];
    if (cols.includes('status')) updateFields.push(`status = 'Draft'`);
    if (cols.includes('frm_status')) updateFields.push(`frm_status = 'Draft'`);
    if (cols.includes('approver_role_id')) updateFields.push(`approver_role_id = NULL`);
    if (cols.includes('assigned_approver_id')) updateFields.push(`assigned_approver_id = NULL`);
    if (cols.includes('approval_remarks')) updateFields.push(`approval_remarks = NULL`);

    if (updateFields.length > 0) {
      const resetProj = await db.query(
        `UPDATE t_frm_project SET ${updateFields.join(', ')} WHERE id = $1 RETURNING *`,
        [Number(recordId)]
      );
      console.log(`✓ Reset t_frm_project record:`, {
        id: resetProj.rows[0]?.id,
        status: resetProj.rows[0]?.status,
        project_name: resetProj.rows[0]?.project_name || resetProj.rows[0]?.name
      });
    }

    console.log(`\n🎉 All approval data for Project #${recordId} has been successfully cleared and reset to Draft!`);
  } catch (err) {
    console.error('Error clearing approval data:', err);
  } finally {
    process.exit(0);
  }
}

clearApprovalData();
