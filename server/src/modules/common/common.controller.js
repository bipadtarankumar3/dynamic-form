// server/src/modules/common/common.controller.js
// ============================================================
// Common controller using raw pg.
// Handles user profile permissions loading, logout token revocation.
// ============================================================

const db = require("../../config/db");
const rbacEngine = require("../../services/rbacEngine");

const fs = require("fs");
const path = require("path");

const storageService = require("../../services/storage.service");

const deleteDocument = async (req, res, next) => {
  const { documentId } = req.body;
  try {
    if (!documentId) {
      return res.status(400).json({ status: false, message: "Document ID is required." });
    }

    const deleted = await storageService.deleteFile({
      tdocId: documentId,
      userId: req.user?.user_id || null,
    });

    if (!deleted) {
      return res.status(404).json({ status: false, message: "Document not found or already deleted." });
    }

    return res.status(200).json({ status: true, message: "Document deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (token) {
      await db.query(
        `UPDATE t_access_tokens SET deleted_at = NOW() WHERE token = $1`,
        [token]
      );
    }
    return res.status(200).json({ status: true, message: "Logout successful" });
  } catch (error) {
    next(error);
  }
};

const fetchPermissions = async (req, res, next) => {
  try {
    const { role_id, isConfigurator } = req.user;
    
    // Fetch user permissions keys
    const permKeys = await rbacEngine.getRolePermissions(role_id);

    // Convert keys list ['module.action'] -> { module: ['action'] }
    const permissionsMap = {};
    permKeys.forEach((key) => {
      const parts = key.split(".");
      const moduleSlug = parts[0];
      const actionSlug = parts[1] || "view";

      if (!permissionsMap[moduleSlug]) {
        permissionsMap[moduleSlug] = [];
      }
      permissionsMap[moduleSlug].push(actionSlug);
    });

    res.status(200).json({
      status: true,
      message: "Permissions fetched successfully",
      data: permissionsMap,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  deleteDocument,
  fetchPermissions,
  logout,
};
