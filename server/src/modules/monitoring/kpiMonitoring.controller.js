// server/src/modules/monitoring/kpiMonitoring.controller.js
// ============================================================
// KPI Monitoring Tracking Controller
// Fetches project KPI rows and saves actual achievement values
// per monitoring record in t_frm_monitoring_kpi_tracking
// ============================================================

const db = require("../../config/db");

/**
 * Helper to ensure tracking table exists with all required columns
 */
const ensureTrackingTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS t_frm_monitoring_kpi_tracking (
      id              SERIAL PRIMARY KEY,
      monitoring_id   INT,
      parent_id       INT,
      project_id      INT,
      kpi_detail_id   INT,
      kpi_master      VARCHAR(255),
      kpi_name        VARCHAR(255),
      target_value    NUMERIC(18,2),
      actual_value    NUMERIC(18,2),
      value           TEXT,
      uom             TEXT,
      remarks         TEXT,
      created_at      TIMESTAMP DEFAULT NOW(),
      updated_at      TIMESTAMP DEFAULT NOW(),
      deleted_at      TIMESTAMP
    )
  `);

  await db.query(`ALTER TABLE t_frm_monitoring_kpi_tracking ADD COLUMN IF NOT EXISTS monitoring_id INT`).catch(() => {});
  await db.query(`ALTER TABLE t_frm_monitoring_kpi_tracking ADD COLUMN IF NOT EXISTS project_id INT`).catch(() => {});
  await db.query(`ALTER TABLE t_frm_monitoring_kpi_tracking ADD COLUMN IF NOT EXISTS kpi_detail_id INT`).catch(() => {});
  await db.query(`ALTER TABLE t_frm_monitoring_kpi_tracking ADD COLUMN IF NOT EXISTS kpi_name VARCHAR(255)`).catch(() => {});
  await db.query(`ALTER TABLE t_frm_monitoring_kpi_tracking ADD COLUMN IF NOT EXISTS target_value NUMERIC(18,2)`).catch(() => {});
  await db.query(`ALTER TABLE t_frm_monitoring_kpi_tracking ADD COLUMN IF NOT EXISTS actual_value NUMERIC(18,2)`).catch(() => {});
  await db.query(`ALTER TABLE t_frm_monitoring_kpi_tracking ADD COLUMN IF NOT EXISTS uom TEXT`).catch(() => {});
  await db.query(`ALTER TABLE t_frm_monitoring_kpi_tracking ADD COLUMN IF NOT EXISTS remarks TEXT`).catch(() => {});
};

/**
 * GET /api/v1/monitoring/kpi-rows?project_id=<id>&monitoring_id=<id>
 * Fetch all KPI rows for a project from t_frm_project_project_kpis (or t_frm_project_kpi_details)
 * joined with t_frm_kpi_master for KPI name & unit info, including historical previous actuals.
 */
const getProjectKpiRows = async (req, res, next) => {
  try {
    const { project_id, monitoring_id } = req.query;

    if (!project_id) {
      return res.status(400).json({ success: false, message: "project_id is required" });
    }

    await ensureTrackingTable();

    // 1. Primary Query: Try t_frm_project_project_kpis (created by form builder for project KPIs section)
    let rows = [];
    try {
      const result = await db.query(`
        SELECT
          pk.id AS kpi_detail_id,
          pk.parent_id AS project_id,
          COALESCE(km.kpi_name, CAST(pk.kpi AS TEXT), 'KPI #' || pk.id::text) AS kpi_name,
          COALESCE(NULLIF(pk.uom, ''), km.unit_of_measure, 'Count') AS unit,
          COALESCE(CAST(NULLIF(pk.target_value, '') AS NUMERIC), 0) AS target_value,
          COALESCE(km.frequency_of_measurement, 'Monthly') AS kpi_category,
          '' AS description
        FROM t_frm_project_project_kpis pk
        LEFT JOIN t_frm_kpi_master km ON (
          km.id = CASE WHEN CAST(pk.kpi AS TEXT) ~ '^[0-9]+$' THEN CAST(pk.kpi AS INTEGER) ELSE NULL END
        )
        WHERE pk.parent_id = $1
          AND pk.deleted_at IS NULL
        ORDER BY pk.id ASC
      `, [project_id]);
      rows = result.rows;
    } catch (joinErr) {
      console.log("[getProjectKpiRows] Primary query (t_frm_project_project_kpis) error:", joinErr.message);
    }

    // 2. Secondary Query: Fallback to t_frm_project_kpi_details if primary returned nothing
    if (rows.length === 0) {
      try {
        const fallback = await db.query(`
          SELECT
            pkd.id AS kpi_detail_id,
            pkd.parent_id AS project_id,
            COALESCE(km.kpi_name, pkd.kpi_master, 'KPI #' || pkd.id::text) AS kpi_name,
            COALESCE(pkd.uom, km.unit_of_measure, 'Count') AS unit,
            COALESCE(pkd.kpi_target, pkd.target_value, 0) AS target_value,
            COALESCE(km.frequency_of_measurement, 'Monthly') AS kpi_category,
            '' AS description
          FROM t_frm_project_kpi_details pkd
          LEFT JOIN t_frm_kpi_master km ON (
            km.id = CASE WHEN CAST(pkd.kpi_master AS TEXT) ~ '^[0-9]+$' THEN CAST(pkd.kpi_master AS INTEGER) ELSE NULL END
          )
          WHERE pkd.parent_id = $1
            AND pkd.deleted_at IS NULL
          ORDER BY pkd.id ASC
        `, [project_id]);
        rows = fallback.rows;
      } catch (fallbackErr) {
        console.log("[getProjectKpiRows] Fallback query error:", fallbackErr.message);
      }
    }

    // 3. Fetch Sum of Previous Actual Achievements for each KPI in prior monitoring records
    let prevMap = {};
    try {
      const prevParams = [project_id];
      let prevWhere = `WHERE (project_id = $1 OR parent_id = $1)`;
      if (monitoring_id) {
        prevParams.push(monitoring_id);
        prevWhere += ` AND (monitoring_id != $2 AND parent_id != $2)`;
      }
      prevWhere += ` AND deleted_at IS NULL`;

      const prevRes = await db.query(`
        SELECT
          COALESCE(kpi_detail_id, CASE WHEN CAST(kpi_master AS TEXT) ~ '^[0-9]+$' THEN CAST(kpi_master AS INTEGER) ELSE NULL END) AS kpi_id,
          SUM(COALESCE(actual_value, CASE WHEN CAST(value AS TEXT) ~ '^[0-9.]+$' THEN CAST(value AS NUMERIC) ELSE 0 END, 0)) AS total_previous
        FROM t_frm_monitoring_kpi_tracking
        ${prevWhere}
        GROUP BY 1
      `, prevParams);

      (prevRes.rows || []).forEach(r => {
        if (r.kpi_id) {
          prevMap[r.kpi_id] = parseFloat(r.total_previous) || 0;
        }
      });
    } catch (pErr) {
      console.log("[getProjectKpiRows] Previous actuals query notice:", pErr.message);
    }

    // 4. Enrich output rows
    const enrichedRows = rows.map(r => ({
      ...r,
      target_value: parseFloat(r.target_value) || 0,
      previous_actual: prevMap[r.kpi_detail_id] || 0
    }));

    return res.status(200).json({ success: true, data: enrichedRows });

  } catch (err) {
    console.error("[getProjectKpiRows] Error:", err);
    return res.status(200).json({ success: true, data: [] });
  }
};

/**
 * GET /api/v1/monitoring/kpi-tracking?monitoring_id=<id>
 * Fetch already saved actual values for a monitoring record
 */
const getMonitoringKpiTracking = async (req, res, next) => {
  try {
    const { monitoring_id } = req.query;

    if (!monitoring_id) {
      return res.status(400).json({ success: false, message: "monitoring_id is required" });
    }

    await ensureTrackingTable();

    const result = await db.query(`
      SELECT
        id,
        COALESCE(monitoring_id, parent_id) AS monitoring_id,
        project_id,
        COALESCE(kpi_detail_id, CASE WHEN CAST(kpi_master AS TEXT) ~ '^[0-9]+$' THEN CAST(kpi_master AS INTEGER) ELSE id END) AS kpi_detail_id,
        COALESCE(kpi_name, '') AS kpi_name,
        COALESCE(target_value, 0) AS target_value,
        COALESCE(actual_value, CASE WHEN CAST(value AS TEXT) ~ '^[0-9.]+$' THEN CAST(value AS NUMERIC) ELSE 0 END, 0) AS actual_value,
        COALESCE(uom, '') AS unit,
        COALESCE(remarks, '') AS remarks
      FROM t_frm_monitoring_kpi_tracking
      WHERE (monitoring_id = $1 OR parent_id = $1)
        AND deleted_at IS NULL
      ORDER BY id ASC
    `, [monitoring_id]);

    return res.status(200).json({ success: true, data: result.rows });

  } catch (err) {
    console.error("[getMonitoringKpiTracking] Error:", err);
    return res.status(200).json({ success: true, data: [] });
  }
};

/**
 * POST /api/v1/monitoring/kpi-tracking/save
 * Upsert actual KPI achievement values for a monitoring record
 * Body: { monitoring_id, project_id, kpi_rows: [{ kpi_detail_id, kpi_name, target_value, actual_value, unit, remarks }] }
 */
const saveMonitoringKpiTracking = async (req, res, next) => {
  try {
    const { monitoring_id, project_id, kpi_rows } = req.body || {};

    if (!monitoring_id || !Array.isArray(kpi_rows) || kpi_rows.length === 0) {
      return res.status(400).json({ success: false, message: "monitoring_id and kpi_rows are required" });
    }

    await saveMonitoringKpiTrackingHelper(monitoring_id, project_id, kpi_rows);

    return res.status(200).json({
      success: true,
      message: `KPI tracking saved successfully for Monitoring #${monitoring_id}!`
    });

  } catch (err) {
    console.error("[saveMonitoringKpiTracking] Error:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to save KPI tracking." });
  }
};

/**
 * Reusable helper function to upsert KPI tracking rows
 */
const saveMonitoringKpiTrackingHelper = async (monitoring_id, project_id, kpi_rows) => {
  if (!monitoring_id || !Array.isArray(kpi_rows) || kpi_rows.length === 0) return;

  await ensureTrackingTable();

  const client = await db.getClient();
  try {
    await client.query("BEGIN");

    for (const row of kpi_rows) {
      const { kpi_detail_id, kpi_name, target_value, actual_value, unit, uom, remarks } = row;
      const actualVal = parseFloat(actual_value) || 0;
      const targetVal = parseFloat(target_value) || 0;
      const unitStr   = unit || uom || "";

      const kpiDetailStr = String(kpi_detail_id || "");
      const actualValStr = String(actualVal);

      const existing = await client.query(
        `SELECT id FROM t_frm_monitoring_kpi_tracking
         WHERE (monitoring_id = $1 OR parent_id = $1)
           AND (kpi_detail_id = $2 OR kpi_master = $3)
           AND deleted_at IS NULL
         LIMIT 1`,
        [monitoring_id, kpi_detail_id, kpiDetailStr]
      );

      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE t_frm_monitoring_kpi_tracking
           SET actual_value = $1,
               value = $2,
               target_value = $3,
               uom = $4,
               remarks = $5,
               updated_at = NOW()
           WHERE id = $6`,
          [actualVal, actualValStr, targetVal, unitStr, remarks || "", existing.rows[0].id]
        );
      } else {
        await client.query(
          `INSERT INTO t_frm_monitoring_kpi_tracking
             (monitoring_id, parent_id, project_id, kpi_detail_id, kpi_master, kpi_name, target_value, actual_value, value, uom, remarks)
           VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            monitoring_id,
            project_id || null,
            kpi_detail_id,
            kpiDetailStr,
            kpi_name || "",
            targetVal,
            actualVal,
            actualValStr,
            unitStr,
            remarks || ""
          ]
        );
      }
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[saveMonitoringKpiTrackingHelper] Error:", err);
    throw err;
  } finally {
    client.release();
  }
};

// ── Register Backend Hook for Monitoring Form ─────────────────────────
const { registerBackendHook } = require("../dynamic-form/hooks/backendHookRegistry");

registerBackendHook("monitoring", {
  onAfterInsert: async ({ insertedId, payload, extraFields, req }) => {
    if (!extraFields?.kpi_tracking || !Array.isArray(extraFields.kpi_tracking)) return;
    const projectId = extraFields.project_id || payload?.project_id || payload?.project || req?.body?.parent_id || null;
    await saveMonitoringKpiTrackingHelper(insertedId, projectId, extraFields.kpi_tracking);
  },
  onAfterUpdate: async ({ updatedId, payload, extraFields, req }) => {
    if (!extraFields?.kpi_tracking || !Array.isArray(extraFields.kpi_tracking)) return;
    const projectId = extraFields.project_id || payload?.project_id || payload?.project || req?.body?.parent_id || null;
    await saveMonitoringKpiTrackingHelper(updatedId, projectId, extraFields.kpi_tracking);
  }
});

module.exports = {
  getProjectKpiRows,
  getMonitoringKpiTracking,
  saveMonitoringKpiTracking
};
