const mongoose = require('mongoose');
const { getFormCollection } = require('../../utils/formCollection.util');

const getProjectKpiRows = async (req, res) => {
  try {
    const { project_id, monitoring_id } = req.query;

    if (!project_id) {
      return res.status(400).json({ success: false, message: 'project_id is required' });
    }

    // Try finding KPIs from project subforms or master
    const { Model: ProjectKpiModel } = await getFormCollection('project_kpis');
    const { Model: KpiMasterModel } = await getFormCollection('kpi_master');
    const { Model: TrackingModel } = await getFormCollection('monitoring_kpi_tracking');

    let kpis = [];
    try {
      kpis = await ProjectKpiModel.find({
        $or: [
          { parent_id: project_id },
          { project_id: project_id },
          { 'data.parent_id': project_id },
          { 'data.project_id': project_id }
        ]
      }).lean();
    } catch (e) {}

    // Fallback: check project_kpi_details
    if (!kpis.length) {
      try {
        const { Model: PkdModel } = await getFormCollection('project_kpi_details');
        kpis = await PkdModel.find({
          $or: [
            { parent_id: project_id },
            { project_id: project_id },
            { 'data.parent_id': project_id },
            { 'data.project_id': project_id }
          ]
        }).lean();
      } catch (e) {}
    }

    // Previous actuals map
    const prevMap = {};
    try {
      const trackingFilter = {
        $or: [{ project_id }, { 'data.project_id': project_id }, { parent_id: project_id }]
      };
      if (monitoring_id) {
        trackingFilter.$and = [
          { monitoring_id: { $ne: monitoring_id } },
          { 'data.monitoring_id': { $ne: monitoring_id } }
        ];
      }

      const pastTracking = await TrackingModel.find(trackingFilter).lean();
      pastTracking.forEach(t => {
        const flat = { ...t, ...(t.data || {}) };
        const kId = flat.kpi_detail_id || flat.kpi_id || t._id.toString();
        const val = parseFloat(flat.actual_value || flat.value) || 0;
        prevMap[kId] = (prevMap[kId] || 0) + val;
      });
    } catch (e) {}

    // Enrich rows
    const enrichedRows = await Promise.all(kpis.map(async (k) => {
      const flat = { ...k, ...(k.data || {}) };
      const kpiId = k._id.toString();

      // Look up master if needed
      let masterName = flat.kpi_name || flat.kpi;
      let uom = flat.uom || flat.unit || 'Count';

      if (flat.kpi && mongoose.Types.ObjectId.isValid(flat.kpi)) {
        try {
          const master = await KpiMasterModel.findById(flat.kpi).lean();
          if (master) {
            const mFlat = { ...master, ...(master.data || {}) };
            masterName = mFlat.kpi_name || masterName;
            uom = mFlat.unit_of_measure || uom;
          }
        } catch (e) {}
      }

      return {
        kpi_detail_id: kpiId,
        project_id,
        kpi_name: masterName || `KPI #${kpiId.slice(-4)}`,
        unit: uom,
        target_value: parseFloat(flat.target_value || flat.kpi_target) || 0,
        kpi_category: flat.frequency_of_measurement || 'Monthly',
        previous_actual: prevMap[kpiId] || 0
      };
    }));

    res.json({ success: true, data: enrichedRows });
  } catch (err) {
    console.error('[getProjectKpiRows] Error:', err);
    res.status(200).json({ success: true, data: [] });
  }
};

const getMonitoringKpiTracking = async (req, res) => {
  try {
    const { monitoring_id } = req.query;

    if (!monitoring_id) {
      return res.status(400).json({ success: false, message: 'monitoring_id is required' });
    }

    const { Model } = await getFormCollection('monitoring_kpi_tracking');
    const rows = await Model.find({
      $or: [
        { monitoring_id },
        { parent_id: monitoring_id },
        { 'data.monitoring_id': monitoring_id },
        { 'data.parent_id': monitoring_id }
      ]
    }).lean();

    const data = rows.map(r => {
      const flat = { ...r, ...(r.data || {}) };
      return {
        id: r._id.toString(),
        monitoring_id: flat.monitoring_id || monitoring_id,
        project_id: flat.project_id,
        kpi_detail_id: flat.kpi_detail_id || r._id.toString(),
        kpi_name: flat.kpi_name || '',
        target_value: parseFloat(flat.target_value) || 0,
        actual_value: parseFloat(flat.actual_value || flat.value) || 0,
        unit: flat.uom || flat.unit || '',
        remarks: flat.remarks || ''
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('[getMonitoringKpiTracking] Error:', err);
    res.status(200).json({ success: true, data: [] });
  }
};

const saveMonitoringKpiTracking = async (req, res) => {
  try {
    const { monitoring_id, project_id, kpi_rows } = req.body || {};

    if (!monitoring_id || !Array.isArray(kpi_rows) || kpi_rows.length === 0) {
      return res.status(400).json({ success: false, message: 'monitoring_id and kpi_rows are required' });
    }

    const { Model } = await getFormCollection('monitoring_kpi_tracking');

    for (const row of kpi_rows) {
      const actualVal = parseFloat(row.actual_value) || 0;
      const targetVal = parseFloat(row.target_value) || 0;
      const unitStr = row.unit || row.uom || '';
      const kpiDetailId = String(row.kpi_detail_id || '');

      await Model.findOneAndUpdate(
        {
          $or: [
            { monitoring_id, kpi_detail_id: kpiDetailId },
            { 'data.monitoring_id': monitoring_id, 'data.kpi_detail_id': kpiDetailId }
          ]
        },
        {
          $set: {
            monitoring_id,
            parent_id: monitoring_id,
            project_id: project_id || null,
            kpi_detail_id: kpiDetailId,
            kpi_name: row.kpi_name || '',
            target_value: targetVal,
            actual_value: actualVal,
            uom: unitStr,
            remarks: row.remarks || '',
            data: {
              monitoring_id,
              project_id,
              kpi_detail_id: kpiDetailId,
              kpi_name: row.kpi_name || '',
              target_value: targetVal,
              actual_value: actualVal,
              unit: unitStr,
              remarks: row.remarks || ''
            }
          }
        },
        { upsert: true, new: true }
      );
    }

    res.json({
      success: true,
      message: `KPI tracking saved successfully for Monitoring #${monitoring_id}!`
    });
  } catch (err) {
    console.error('[saveMonitoringKpiTracking] Error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to save KPI tracking' });
  }
};

module.exports = {
  getProjectKpiRows,
  getMonitoringKpiTracking,
  saveMonitoringKpiTracking
};
