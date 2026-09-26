// server/src/modules/dynamic-form/hooks/projectHooks.js
// ============================================================
// Backend Hook for "project" form
// Handles RFP Tagging, Implementation Partner Association,
// and NGO Portal Project Visibility.
// ============================================================

const { sequelize } = require("../../../config/db.config");
const { registerBackendHook } = require("./backendHookRegistry");

registerBackendHook("project", {
  /**
   * After a new project is created
   */
  onAfterInsert: async ({ insertedId, payload, extraFields, req }) => {
    try {
      const rfpId = extraFields?.rfp_id || req?.body?.rfp_id || null;
      const ngoId = extraFields?.ngo_id || req?.body?.ngo_id || null;
      const ngoName = extraFields?.ngo_name || req?.body?.ngo_name || "";

      console.log(`[projectHook onAfterInsert] Project ID: ${insertedId}, RFP ID: ${rfpId}, NGO ID: ${ngoId}`);

      // 0. Update rfp_id directly on t_frm_project
      if (insertedId && rfpId) {
        try {
          await sequelize.query(
            `UPDATE t_frm_project SET rfp_id = :rfpId, updated_at = NOW() WHERE id = :projectId`,
            { replacements: { rfpId: parseInt(rfpId, 10), projectId: insertedId } }
          );
          console.log(`[projectHook] Stored rfp_id = ${rfpId} in t_frm_project for Project #${insertedId}`);
        } catch (err) {
          console.warn("[projectHook] Store rfp_id in t_frm_project notice:", err.message);
        }
      }

      // 1. Ensure row in t_frm_project_implementation_partner exists
      if (insertedId && ngoId) {
        try {
          const [partnerRows] = await sequelize.query(
            `SELECT id FROM t_frm_project_implementation_partner 
             WHERE parent_id = :projectId AND (partner = :ngoIdInt OR partner::text = :ngoIdStr)
             LIMIT 1`,
            {
              replacements: {
                projectId: insertedId,
                ngoIdInt: parseInt(ngoId, 10) || 0,
                ngoIdStr: String(ngoId),
              }
            }
          );

          if (!partnerRows || partnerRows.length === 0) {
            await sequelize.query(
              `INSERT INTO t_frm_project_implementation_partner 
               (parent_id, partner, status, created_at, updated_at)
               VALUES (:projectId, :ngoId, 'draft', NOW(), NOW())`,
              {
                replacements: {
                  projectId: insertedId,
                  ngoId: parseInt(ngoId, 10) || ngoId,
                }
              }
            );
            console.log(`[projectHook] Linked NGO Partner #${ngoId} to Project #${insertedId} in t_frm_project_implementation_partner`);
          }
        } catch (err) {
          console.warn("[projectHook] Partner link notice:", err.message);
        }
      }

      // 2. Tag RFP record if created from RFP
      if (rfpId && insertedId) {
        try {
          const [colsRows] = await sequelize.query(
            `SELECT column_name FROM information_schema.columns WHERE table_name = 't_frm_request_for_proposal'`
          );
          const cols = colsRows.map(r => r.column_name);

          let updateParts = ["status = 'Project Created'", "updated_at = NOW()"];
          let replacements = { rfpId: parseInt(rfpId, 10), projectId: insertedId };

          if (cols.includes("project_id")) {
            updateParts.push(`project_id = :projectId`);
          }

          if (cols.includes("tagged_ngo_id") && ngoId) {
            updateParts.push(`tagged_ngo_id = COALESCE(tagged_ngo_id, :taggedNgoId)`);
            replacements.taggedNgoId = parseInt(ngoId, 10) || ngoId;
          }

          if (cols.includes("tagged_ngo_name") && ngoName) {
            updateParts.push(`tagged_ngo_name = COALESCE(tagged_ngo_name, :taggedNgoName)`);
            replacements.taggedNgoName = ngoName;
          }

          const rfpUpdateQuery = `UPDATE t_frm_request_for_proposal SET ${updateParts.join(", ")} WHERE id = :rfpId`;
          await sequelize.query(rfpUpdateQuery, { replacements });
          console.log(`[projectHook] Tagged RFP #${rfpId} with Project #${insertedId}`);

          // Update submission proposal status to 'Awarded'
          try {
            await sequelize.query(
              `UPDATE t_frm_rfp_proposal_submission 
               SET final_status = 'Awarded', updated_at = NOW() 
               WHERE parent_id = :rfpId AND (created_by = :ngoIdInt OR id = :ngoIdInt)`,
              { replacements: { rfpId: parseInt(rfpId, 10), ngoIdInt: parseInt(ngoId, 10) || 0 } }
            );
          } catch (e) {}

          try {
            await sequelize.query(
              `UPDATE t_frm_rfp_submission 
               SET final_status = 'Awarded', updated_at = NOW() 
               WHERE parent_id = :rfpId AND (created_by = :ngoIdInt OR id = :ngoIdInt)`,
              { replacements: { rfpId: parseInt(rfpId, 10), ngoIdInt: parseInt(ngoId, 10) || 0 } }
            );
          } catch (e) {}

          // Insert Approval Process Track record
          try {
            const currentUserId = parseInt(req?.user?.id || req?.user?.user_id || 1, 10);
            const currentUserRole = String(req?.user?.role_name || req?.user?.role_slug || req?.user?.role || "Admin");

            await sequelize.query(
              `INSERT INTO t_approval_process_track
                (apt_type, apt_item_id, apt_user_id, apt_user_role, apt_accept_step, apt_remarks, apt_accept_status, apt_status_flag, apt_created_at, apt_updated_at, apt_created_by, apt_updated_by)
               VALUES
                ('RFP_ASSESSMENT', :rfpId, :userId, :userRole, 'Project Created', :remarks, 'Approved', 'COMPLETED', NOW(), NOW(), :userId, :userId)`,
              {
                replacements: {
                  rfpId: parseInt(rfpId, 10),
                  userId: currentUserId,
                  userRole: currentUserRole,
                  remarks: `Project #${insertedId} created and tagged for partner ${ngoName || ngoId}`,
                }
              }
            );
          } catch (trackErr) {
            console.warn("[projectHook] Track insert notice:", trackErr.message);
          }
        } catch (rfpErr) {
          console.warn("[projectHook] RFP update notice:", rfpErr.message);
        }
      }
    } catch (error) {
      console.error("[projectHook onAfterInsert Error]:", error);
    }
  }
});

module.exports = {};
