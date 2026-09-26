const { sequelize } = require("../config/db.config");

async function setAuditUser(transaction, userId) {
  if (!transaction) {
    throw new Error("Transaction is required to set audit user.");
  }

  await sequelize.query("SET LOCAL application.current_user_id = :userId", {
    replacements: { userId: userId || null },
    transaction,
  });
}

module.exports = { setAuditUser };
