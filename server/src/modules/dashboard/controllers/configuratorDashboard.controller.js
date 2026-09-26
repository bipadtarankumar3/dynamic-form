// server/src/modules/dashboard/controllers/configuratorDashboard.controller.js
// ============================================================
// Dedicated Configurator Portal Dashboard Controller
// Provides server-side counts, KPIs, and listings for:
//   - Forms Builder
//   - Master Configs
//   - Sidebar Menus
//   - Dashboard Builder
//   - Report Builder
//   - Site Settings & Roles
// ============================================================

const db = require("../../../config/db");

const getConfiguratorDashboardOverview = async (req, res, next) => {
  try {
    const [
      formsCountRes,
      masterCountRes,
      draftsCountRes,
      publishedCountRes,
      menusCountRes,
      widgetsCountRes,
      reportsCountRes,
      rolesCountRes,
      recentFormsRes,
      recentMastersRes,
      recentMenusRes,
      recentReportsRes
    ] = await Promise.allSettled([
      // 1. General Forms Count
      db.query(`SELECT COUNT(*) AS count FROM t_form WHERE deleted_at IS NULL AND (is_master IS NOT TRUE OR is_master = FALSE)`),
      // 2. Master Configs Count
      db.query(`SELECT COUNT(*) AS count FROM t_form WHERE deleted_at IS NULL AND is_master = TRUE`),
      // 3. Draft Forms Count
      db.query(`SELECT COUNT(*) AS count FROM t_form WHERE deleted_at IS NULL AND (to_jsonb(t_form)->>'is_draft') = 'true'`),
      // 4. Published Forms Count
      db.query(`SELECT COUNT(*) AS count FROM t_form WHERE deleted_at IS NULL AND ((to_jsonb(t_form)->>'is_draft') IS DISTINCT FROM 'true')`),
      // 5. Sidebar Menus Count
      db.query(`SELECT COUNT(*) AS count FROM t_menus WHERE deleted_at IS NULL AND is_active = TRUE`),
      // 6. Custom Dashboard Widgets Count
      db.query(`SELECT COUNT(*) AS count FROM t_custom_dashboard_widgets WHERE tcdw_deleted_at IS NULL AND tcdw_is_active = TRUE`).catch(() => ({ rows: [{ count: 0 }] })),
      // 7. Dynamic Dashboards Count
      db.query(`SELECT COUNT(*) AS count FROM t_custom_dashboards WHERE tdb_deleted_at IS NULL AND tdb_is_active = TRUE`).catch(() => ({ rows: [{ count: 0 }] })),
      // 8. Roles Count
      db.query(`SELECT COUNT(*) AS count FROM t_roles WHERE deleted_at IS NULL`).catch(() => ({ rows: [{ count: 0 }] })),

      // 9. Recent Form Schemas
      db.query(`
        SELECT f.form_id AS id, f.title, f.title AS name, f.slug,
               COALESCE(f.root_entity->>'table', '') AS table_name,
               f.is_master,
               (to_jsonb(f)->>'is_draft') = 'true' AS is_draft,
               f.created_at
        FROM t_form f
        WHERE f.deleted_at IS NULL
        ORDER BY f.created_at DESC
        LIMIT 10
      `),
      // 10. Recent Master Schemas
      db.query(`
        SELECT f.form_id AS id, f.title, f.title AS name, f.slug,
               COALESCE(f.root_entity->>'table', '') AS table_name,
               f.created_at
        FROM t_form f
        WHERE f.deleted_at IS NULL AND f.is_master = TRUE
        ORDER BY f.created_at DESC
        LIMIT 10
      `),
      // 11. Recent Sidebar Menus
      db.query(`
        SELECT id, label, icon, url, is_active, "order"
        FROM t_menus
        WHERE deleted_at IS NULL
        ORDER BY "order" ASC
        LIMIT 10
      `),
      // 12. Recent Widgets
      db.query(`
        SELECT tcdw_id AS rdf_id, tcdw_title AS rdf_name, tcdw_table_name AS rdf_target_table, tcdw_created_at AS created_at
        FROM t_custom_dashboard_widgets
        WHERE tcdw_deleted_at IS NULL
        ORDER BY tcdw_created_at DESC
        LIMIT 10
      `).catch(() => ({ rows: [] }))
    ]);

    const formsCount     = parseInt(formsCountRes.value?.rows?.[0]?.count || 0, 10);
    const masterCount    = parseInt(masterCountRes.value?.rows?.[0]?.count || 0, 10);
    const draftsCount    = parseInt(draftsCountRes.value?.rows?.[0]?.count || 0, 10);
    const publishedCount = parseInt(publishedCountRes.value?.rows?.[0]?.count || 0, 10);
    const menusCount     = parseInt(menusCountRes.value?.rows?.[0]?.count || 0, 10);
    const widgetsCount   = parseInt(widgetsCountRes.value?.rows?.[0]?.count || 0, 10);
    const reportsCount   = parseInt(reportsCountRes.value?.rows?.[0]?.count || 0, 10);
    const rolesCount     = parseInt(rolesCountRes.value?.rows?.[0]?.count || 0, 10);

    const breakdown = [
      { key: "formsbuilder",    name: "Forms Builder",     count: formsCount,   color: "#22c55e", url: "/configurator/formsbuilder" },
      { key: "masterconfigs",   name: "Master Configs",    count: masterCount,  color: "#0369a1", url: "/configurator/masterconfigs" },
      { key: "menus",           name: "Sidebar Menus",     count: menusCount,   color: "#b45309", url: "/configurator/menus" },
      { key: "mother-dashboard", name: "Dashboard Builder", count: widgetsCount, color: "#15803d", url: "/configurator/mother-dashboard" },
      { key: "reports",         name: "Report Builder",    count: reportsCount, color: "#7c3aed", url: "/configurator/reports" },
      { key: "settings",        name: "Site Settings / RBAC", count: rolesCount, color: "#ec4899", url: "/configurator/settings" }
    ];

    return res.status(200).json({
      success: true,
      message: "Configurator dashboard overview loaded successfully",
      data: {
        kpis: {
          forms_count: formsCount,
          master_configs_count: masterCount,
          drafts_count: draftsCount,
          published_count: publishedCount,
          sidebar_menus_count: menusCount,
          dashboard_widgets_count: widgetsCount,
          reports_count: reportsCount,
          roles_count: rolesCount
        },
        breakdown,
        forms_list: recentFormsRes.value?.rows || [],
        master_list: recentMastersRes.value?.rows || [],
        menus_list: recentMenusRes.value?.rows || [],
        reports_list: recentReportsRes.value?.rows || []
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getConfiguratorDashboardOverview
};
