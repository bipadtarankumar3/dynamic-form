const { QueryTypes } = require("sequelize");
const { sequelize } = require("../config/db.config");

const workflowSteps = async ({ workflow_slug }) => {
  try {
    const sql = `
    SELECT
      wd.word_workflow_id,
      wd.word_workflow_name,
      wd.word_version,

      wm.worm_module_id,
      wm.worm_module_name,

      /* ================= STEPS ================= */
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'step_id', ws.wors_step_id,
            'step_order', ws.wors_step_order,
            'step_name', ws.wors_step_name,
            'approver_type', ws.wors_approver_type,

            'role_id', ws.wors_role_id,
            'role_name', r_step.rol_name,

            /* -------- APPROVERS -------- */
            'approvers', COALESCE(
              (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'worsp_id', wsp.worsp_id,
                    'approver_id', u.user_id,
                    'approver_name', u.name
                  )
                )
                FROM workflow_step_approvers wsp
                LEFT JOIN t_user u
                  ON u.user_id = wsp.worsp_approver_id
                WHERE wsp.worsp_step_id = ws.wors_step_id
                  AND wsp.worsp_is_active = true
              ),
              '[]'::jsonb
            ),

            /* -------- ACTIONS -------- */
            'actions', COALESCE(
              (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'action_id', wa.wora_action_id,
                    'action_name', wa.wora_action_name,
                    'next_step', wa.wora_next_step
                  )
                  ORDER BY wa.wora_action_name
                )
                FROM workflow_actions wa
                WHERE wa.wora_step_id = ws.wors_step_id
                  AND wa.wora_is_active = true
              ),
              '[]'::jsonb
            )
          )
          ORDER BY ws.wors_step_order
        ),
        '[]'::jsonb
      ) AS steps

    FROM workflow_definitions wd

    JOIN workflow_modules wm
      ON wm.worm_module_id = wd.word_module_id
     AND wm.worm_is_active = true

    JOIN workflow_steps ws
      ON ws.wors_workflow_id = wd.word_workflow_id
     AND ws.wors_is_active = true

    LEFT JOIN t_role r_step
      ON r_step.rol_id = ws.wors_role_id

    WHERE wd.word_is_active = true AND wd.word_workflow_slug = :workflow_slug

    GROUP BY
      wd.word_workflow_id,
      wd.word_workflow_name,
      wd.word_version,
      wm.worm_module_id,
      wm.worm_module_name

    ORDER BY wd.word_version DESC;
    `;

    const [data] = await sequelize.query(sql, {
      type: QueryTypes.SELECT,
      replacements: { workflow_slug },
    });

    return data;
  } catch (error) {
    throw error;
  }
};

module.exports = { workflowSteps };