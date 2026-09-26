require('dotenv').config();
const { query } = require('../src/config/db');

async function resetVolunteering() {
  try {
    console.log('[RESET] Starting cleanup for event volunteering...');

    // 1. Delete all volunteer assignments / submitted forms
    const delVolRes = await query('DELETE FROM t_frm_volunteering_event_volunteer RETURNING id, event_id, name, email');
    console.log(`[RESET] Deleted ${delVolRes.rowCount} volunteer records.`);

    // 2. Reset event status and volunteer counters
    // Set approval_status = 'APPROVED' (ready to publish)
    // registered_count = 0, attended_count = 0
    const updateEventRes = await query(`
      UPDATE t_frm_volunteering_event
      SET approval_status = 'APPROVED',
          registered_count = 0,
          attended_count = 0,
          status = 'Approved'
      RETURNING id, event_name, approval_status, registered_count, attended_count, status
    `);
    console.log(`[RESET] Updated ${updateEventRes.rowCount} events:`, updateEventRes.rows);

    // 3. Clean up volunteering documents from t_documents if any
    try {
      const delDocsRes = await query("DELETE FROM t_documents WHERE entity_type = 'volunteering' OR file_path LIKE '%volunteering%' RETURNING id, original_name");
      console.log(`[RESET] Deleted ${delDocsRes.rowCount} document records:`, delDocsRes.rows);
    } catch (e) {
      console.log('[RESET] Document cleanup note:', e.message);
    }

    console.log('[RESET SUCCESS] All volunteering events are now APPROVED and have 0 volunteers / 0 submitted forms.');
  } catch (err) {
    console.error('[RESET ERROR]', err);
  } finally {
    process.exit(0);
  }
}

resetVolunteering();
