import { sequelize } from "../config/db.config";

/**
 * Update remaining budget for FY + Theme + Activity
 *
 * @param {object} params
 * @param {string} params.fy_id
 * @param {string} params.theme_id
 * @param {string} params.activity_id
 * @param {number} params.amount        // +ve deduct, -ve add back
 * @param {object} params.transaction    // Sequelize transaction
 */
export async function updateRemainingBudget({
  fy_id,
  theme_id,
  activity_id,
  amount,
  transaction,
}) {
  try {
    if (typeof amount !== "number" || Number.isNaN(amount)) {
      throw new Error("Invalid budget amount");
    }

    // 1️⃣ Lock & fetch budget row
    const [budget] = await sequelize.query(
      `
      SELECT tab.ttabud_id,
             tab.ttabud_remaining_amount
      FROM t_fy_theme_budgets ftb
      JOIN t_theme_activity_budgets tab
        ON tab.ttabud_fy_theme_budget_id = ftb.tftb_id
      WHERE ftb.tftb_financial_id = :fy_id
        AND ftb.tftb_theme_id = :theme_id
        AND tab.ttabud_activity_id = :activity_id
      FOR UPDATE
      `,
      {
        replacements: { fy_id, theme_id, activity_id },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    if (!budget) {
      throw new Error("Budget not found for given FY, Theme and Activity");
    }

    // 3️⃣ Update remaining budget
    await sequelize.query(
      `
      UPDATE t_theme_activity_budgets
      SET ttabud_remaining_amount = ttabud_remaining_amount - :amount
      WHERE ttabud_id = :budget_id
      `,
      {
        replacements: {
          amount,
          budget_id: budget.ttabud_id,
        },
        type: sequelize.QueryTypes.UPDATE,
        transaction,
      }
    );

    return true;

  } catch (error) {
    // rethrow so caller transaction can rollback
    throw error;
  }
}


/**
 * Adjust remaining budget using delta logic
 * delta > 0  → deduct
 * delta < 0  → add back
 */
export async function adjustRemainingBudget({
  fy_id,
  theme_id,
  activity_id,
  delta,
  transaction,
}) {
  try {
    // 🔒 Validate delta
    if (typeof delta !== "number" || Number.isNaN(delta)) {
      throw new Error("Invalid delta amount");
    }

    // Nothing to update
    if (delta === 0) return;

    // 🔐 Lock + fetch budget row
    const [budget] = await sequelize.query(
      `
      SELECT tab.ttabud_id,
             tab.ttabud_remaining_amount
      FROM t_fy_theme_budgets ftb
      JOIN t_theme_activity_budgets tab
        ON tab.ttabud_fy_theme_budget_id = ftb.tftb_id
      WHERE ftb.tftb_financial_id = :fy_id
        AND ftb.tftb_theme_id = :theme_id
        AND tab.ttabud_activity_id = :activity_id
      FOR UPDATE
      `,
      {
        replacements: { fy_id, theme_id, activity_id },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    if (!budget) {
      throw new Error(
        "Budget not found for given Financial Year, Theme, and Activity"
      );
    }

    // 🚫 Validate only when increasing amount
    if (delta > 0 && budget.ttabud_remaining_amount < delta) {
      throw new Error("Insufficient remaining budget");
    }

    // 🔁 Apply delta (works for +ve and -ve)
    await sequelize.query(
      `
      UPDATE t_theme_activity_budgets
      SET ttabud_remaining_amount = ttabud_remaining_amount - :delta
      WHERE ttabud_id = :budget_id
      `,
      {
        replacements: {
          delta,
          budget_id: budget.ttabud_id,
        },
        type: sequelize.QueryTypes.UPDATE,
        transaction,
      }
    );

  } catch (error) {
    throw error;
  }
}
