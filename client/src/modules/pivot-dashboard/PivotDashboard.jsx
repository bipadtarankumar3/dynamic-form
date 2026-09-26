import React, { useState, useEffect } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { 
  Select, 
  Button, 
  Space, 
  Typography, 
  Drawer, 
  Tooltip, 
  Segmented, 
  Modal, 
  Input, 
  App, 
  Popconfirm,
  Tag,
  Alert,
} from 'antd';
import { 
  BarChartOutlined, 
  ReloadOutlined, 
  PlayCircleOutlined, 
  TableOutlined, 
  AreaChartOutlined, 
  SaveOutlined, 
  ArrowLeftOutlined,
  SettingOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleFilled,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UpOutlined,
  DownOutlined,
} from '@ant-design/icons';

import PivotSidebar from './components/PivotSidebar';
import PivotDropZones from './components/PivotDropZones';
import PivotResultTable from './components/PivotResultTable';
import PivotChart from './components/PivotChart';
import ActionsPanel from './components/ActionsPanel';
import '@/modules/dashboard-builder/DashboardBuilder.css';
import './PivotDashboard.css';

const { Title, Text } = Typography;
import { getTables, getColumns, executePivot, exportPivotExcel, savePivotReport } from '@/services/pivot-service';

const PivotDashboard = ({ editingReport = null, onBack = null }) => {
  const { message } = App.useApp();
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [availableFields, setAvailableFields] = useState([]);
  
  const [zones, setZones] = useState({
    filters: [],
    columns: [],
    rows: [],
    values: [],
  });

  const [activeField, setActiveField] = useState(null);
  const [chartType, setChartType] = useState('none');
  const [showResults, setShowResults] = useState(false);
  const [resultData, setResultData] = useState([]);
  const [resultView, setResultView] = useState('table');
  const [actionsVisible, setActionsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Report name in top header bar
  const [reportName, setReportName] = useState('');
  const [validationError, setValidationError] = useState(null);
  const [saveNameError, setSaveNameError] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const res = await getTables();
        if (res.data?.status) setTables(res.data.data);
      } catch (err) {
        console.error('Failed to fetch tables', err);
      }
    };
    fetchTables();
  }, []);

  // Preload editing report if passed
  useEffect(() => {
    if (editingReport) {
      const tbl = editingReport.tpsr_table_name || editingReport.table_name;
      const conf = editingReport.tpsr_configuration || editingReport.configuration;
      const ct = editingReport.tpsr_chart_type || editingReport.chart_type || 'none';
      const rName = editingReport.tpsr_report_name || editingReport.report_name || '';

      setReportName(rName);
      setChartType(ct);
      if (ct !== 'none') {
        setResultView('chart');
      } else {
        setResultView('table');
      }

      if (tbl) {
        setSelectedTable(tbl);
        getColumns(tbl).then((res) => {
          if (res.data?.status) {
            const sortedFields = [...(res.data.data || [])].sort((a, b) => 
              (a.label || '').localeCompare(b.label || '', undefined, { sensitivity: 'base' })
            );
            setAvailableFields(sortedFields);
          }
        });
      }

      if (conf) {
        setZones(conf);
        if (tbl && ((conf.rows && conf.rows.length > 0) || (conf.values && conf.values.length > 0))) {
          executePivot({
            tableName: tbl,
            rows: conf.rows || [],
            columns: conf.columns || [],
            values: conf.values || [],
            filters: conf.filters || [],
          }).then((res) => {
            if (res.data?.status) {
              setResultData(res.data.data);
              setShowResults(true);
            }
          }).catch(console.error);
        }
      }
    }
  }, [editingReport]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleTableChange = async (tableName) => {
    setSelectedTable(tableName);
    setValidationError(null);
    if (!tableName) {
      setAvailableFields([]);
      setZones({ filters: [], columns: [], rows: [], values: [] });
      setShowResults(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getColumns(tableName);
      if (res.data?.status) {
        const sortedFields = [...(res.data.data || [])].sort((a, b) => 
          (a.label || '').localeCompare(b.label || '', undefined, { sensitivity: 'base' })
        );
        setAvailableFields(sortedFields);
        // Reset zones when table changes
        setZones({ filters: [], columns: [], rows: [], values: [] });
        setShowResults(false);
      }
    } catch (err) {
      console.error('Failed to fetch columns', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = ({ active }) => {
    const fieldData = active.data.current?.field;
    setActiveField(fieldData || null);
  };

  const handleDragEnd = ({ over, active }) => {
    setActiveField(null);
    if (!over || !active.data.current?.field) return;

    setValidationError(null);
    const activeData = active.data.current;
    const overData = over.data.current;

    // SCENARIO 1: Dragging from Sidebar -> DropZone
    if (activeData?.type === 'sidebar-field' || activeData?.type === 'field') {
      const field = activeData.field;
      const targetZoneId = overData?.zoneId || over.id;

      if (['filters', 'columns', 'rows', 'values'].includes(targetZoneId)) {
        setZones(prev => {
          const currentZoneList = prev[targetZoneId] || [];
          if (currentZoneList.some(item => item.id === field.id)) {
            message.info(`Field "${field.label}" is already in ${targetZoneId}`);
            return prev;
          }
          const itemToAdd = targetZoneId === 'values' 
            ? { 
                ...field, 
                agg: field.type === 'number' ? 'sum' : 'count',
                aggType: field.type === 'number' ? 'Sum' : 'Count',
                aggregate: field.type === 'number' ? 'sum' : 'count',
              }
            : { ...field };
          return {
            ...prev,
            [targetZoneId]: [...currentZoneList, itemToAdd]
          };
        });
      }
    }

    // SCENARIO 2: Reordering within same zone or Moving between zones
    if (activeData?.type === 'zone-field') {
      const { zoneId: sourceZone, index: sourceIndex, field } = activeData;
      
      if (['filters', 'columns', 'rows', 'values'].includes(over.id)) {
        const targetZone = over.id;
        if (sourceZone === targetZone) return;

        setZones(prev => {
          const sourceList = [...prev[sourceZone]];
          const targetList = [...prev[targetZone]];
          sourceList.splice(sourceIndex, 1);
          targetList.push(field);
          return {
            ...prev,
            [sourceZone]: sourceList,
            [targetZone]: targetList
          };
        });
      }

      if (overData?.type === 'badge-target') {
        const targetZone = overData.zoneId;
        const targetIndex = overData.index;

        setZones(prev => {
          if (sourceZone === targetZone) {
            const list = [...prev[sourceZone]];
            const [movedItem] = list.splice(sourceIndex, 1);
            list.splice(targetIndex, 0, movedItem);
            return { ...prev, [sourceZone]: list };
          } else {
            const sourceList = [...prev[sourceZone]];
            const targetList = [...prev[targetZone]];
            sourceList.splice(sourceIndex, 1);
            targetList.splice(targetIndex, 0, field);
            return {
              ...prev,
              [sourceZone]: sourceList,
              [targetZone]: targetList
            };
          }
        });
      }
    }
  };

  const handleRemoveItem = (zoneName, idxOrFieldId) => {
    setZones(prev => {
      const currentList = prev[zoneName] || [];
      if (typeof idxOrFieldId === 'number') {
        return {
          ...prev,
          [zoneName]: currentList.filter((_, i) => i !== idxOrFieldId)
        };
      }
      return {
        ...prev,
        [zoneName]: currentList.filter(f => f.id !== idxOrFieldId)
      };
    });
  };

  const handleUpdateItem = (zoneName, idxOrField, updates) => {
    setZones(prev => {
      const currentList = prev[zoneName] || [];
      if (typeof idxOrField === 'number') {
        return {
          ...prev,
          [zoneName]: currentList.map((item, i) => i === idxOrField ? { ...item, ...updates } : item)
        };
      }
      if (typeof idxOrField === 'object' && idxOrField !== null) {
        return {
          ...prev,
          [zoneName]: currentList.map(item => item.id === idxOrField.id ? { ...item, ...idxOrField } : item)
        };
      }
      return {
        ...prev,
        [zoneName]: currentList.map(item => item.id === idxOrField ? { ...item, ...updates } : item)
      };
    });
  };

  const handleReset = () => {
    setZones({ filters: [], columns: [], rows: [], values: [] });
    setShowResults(false);
    setResultData([]);
    setChartType('none');
    setValidationError(null);
  };

  const handleGenerate = async () => {
    if (!selectedTable) {
      setValidationError('Please select a Database View from the left sidebar first.');
      message.warning('Please select a database view first.');
      return;
    }
    if (zones.values.length === 0 && zones.rows.length === 0 && zones.columns.length === 0) {
      setValidationError('Please drag at least one field from Available Fields into Rows, Columns, or Values.');
      message.warning('Please drag at least one field into Rows, Columns, or Values.');
      return;
    }

    setValidationError(null);
    setLoading(true);
    try {
      const payload = {
        tableName: selectedTable,
        zones: {
          rows: zones.rows || [],
          columns: zones.columns || [],
          values: zones.values || [],
          filters: zones.filters || [],
        },
        rows: zones.rows || [],
        columns: zones.columns || [],
        values: zones.values || [],
        filters: zones.filters || [],
      };

      const res = await executePivot(payload);
      if (res.data?.status) {
        setResultData(res.data.data);
        setShowResults(true);
      } else {
        message.error(res.data?.message || 'Failed to generate report.');
      }
    } catch (err) {
      console.error('Pivot execute error', err);
      message.error(err.response?.data?.message || 'Server error while aggregating report data.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (!selectedTable || resultData.length === 0) {
      message.warning('Please generate a report first before exporting.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        tableName: selectedTable,
        rows: zones.rows,
        columns: zones.columns,
        values: zones.values,
        filters: zones.filters,
      };
      const response = await exportPivotExcel(payload);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedTable}_pivot_export.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success('Excel exported successfully!');
    } catch (err) {
      console.error('Export excel error', err);
      message.error('Failed to export Excel.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReport = async () => {
    if (!selectedTable) {
      setValidationError("Please select a Database View from the left sidebar first.");
      message.warning("Please select a database view first.");
      return;
    }
    if (zones.values.length === 0 && zones.rows.length === 0 && zones.columns.length === 0) {
      setValidationError("Please drag at least one field into Rows, Columns, or Values before saving.");
      message.warning("Please drag at least one field into Rows, Columns, or Values.");
      return;
    }
    if (!reportName.trim()) {
      setSaveNameError("Widget Title is required");
      message.warning("Please enter a Widget Title in the top bar.");
      return;
    }
    setSaveNameError(null);
    setSaving(true);
    try {
      const payload = {
        id: editingReport?.tpsr_id || editingReport?.id,
        reportName: reportName.trim(),
        tableName: selectedTable,
        zones,
        chartType,
      };
      const res = await savePivotReport(payload);
      if (res.data?.status) {
        message.success("Widget saved successfully!");
        setActionsVisible(false);
        if (onBack) {
          onBack();
        }
      } else {
        message.error(res.data?.message || "Failed to save widget");
      }
    } catch (error) {
      console.error("Save failed", error);
      message.error("Failed to save widget.");
    } finally {
      setSaving(false);
    }
  };

  const allSelectedFields = [
    ...zones.filters, ...zones.rows, ...zones.columns, ...zones.values,
  ];

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToWindowEdges]}
    >
      <div className="dashboard-builder-container designer-fullscreen">
        {/* Top Designer Header Toolbar matching Dashboard Canvas Designer */}
        <div className="db-designer-toolbar">
          <div className="db-toolbar-left">
            {onBack && (
              <Popconfirm
                title="Exit Widget Builder?"
                description="Are you sure you want to leave? Any unsaved changes will be lost."
                onConfirm={onBack}
                okText="Exit"
                cancelText="Stay"
                okButtonProps={{ danger: true }}
                placement="bottomLeft"
              >
                <Button
                  icon={<ArrowLeftOutlined />}
                  className="db-toolbar-btn"
                >
                  Back
                </Button>
              </Popconfirm>
            )}

            <Tooltip title={sidebarCollapsed ? "Open Available Fields" : "Collapse Sidebar"}>
              <Button
                icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="db-toolbar-btn"
              />
            </Tooltip>

            <Tooltip
              title={saveNameError}
              open={Boolean(saveNameError)}
              placement="bottomLeft"
              color="#ef4444"
              arrow={{ pointAtCenter: true }}
            >
              <Input
                placeholder="Widget Title * (e.g. Beneficiary Visits KPI)"
                value={reportName}
                status={saveNameError ? 'error' : ''}
                onChange={(e) => {
                  setReportName(e.target.value);
                  if (e.target.value.trim()) {
                    setSaveNameError(null);
                    if (validationError && validationError.includes('Title')) {
                      setValidationError(null);
                    }
                  }
                }}
                className="db-toolbar-title-input"
              />
            </Tooltip>

            {selectedTable && (
              <Tooltip title={`Source View: ${selectedTable}`}>
                <Tag
                  color="blue"
                  className="db-toolbar-source-tag"
                >
                  <span>📊</span>
                  <span className="db-toolbar-source-tag-text">
                    {selectedTable}
                  </span>
                </Tag>
              </Tooltip>
            )}
          </div>

          <Space size={10}>
            <Segmented
              className="db-view-segmented"
              options={[
                { label: 'Table', value: 'table', icon: <TableOutlined /> },
                { label: 'Chart', value: 'chart', icon: <AreaChartOutlined /> },
              ]}
              value={resultView}
              onChange={(value) => {
                setResultView(value);
                if (value === 'table') {
                  setChartType('none');
                } else if (value === 'chart') {
                  if (chartType === 'none') {
                    setChartType('bar');
                  }
                }
              }}
            />

            <Select
              className="db-toolbar-select"
              value={resultView === 'table' ? 'none' : (chartType === 'none' ? 'bar' : chartType)}
              onChange={(value) => {
                if (value === 'none') {
                  setChartType('none');
                  setResultView('table');
                } else {
                  setChartType(value);
                  setResultView('chart');
                }
              }}
            >
              {resultView === 'table' ? (
                <Select.Option value="none">Visual: Table</Select.Option>
              ) : (
                <>
                  <Select.Option value="bar">Bar / Column Chart</Select.Option>
                  <Select.Option value="pie">Pie Chart</Select.Option>
                  <Select.Option value="doughnut">Doughnut Chart</Select.Option>
                  <Select.Option value="line">Line Chart</Select.Option>
                  <Select.Option value="area">Area Chart</Select.Option>
                  <Select.Option value="kpi_card">KPI / Stat Card</Select.Option>
                  <Select.Option value="heatmap">Heatmap</Select.Option>
                </>
              )}
            </Select>

            <Tooltip title="Reset Configuration">
              <Button
                icon={<ReloadOutlined />}
                onClick={handleReset}
                className="db-toolbar-btn"
              />
            </Tooltip>

            <Button
              icon={<PlayCircleOutlined />}
              onClick={handleGenerate}
              loading={loading}
              className="db-toolbar-preview-btn"
            >
              Run Preview
            </Button>

            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSaveReport}
              className="db-toolbar-save-btn"
            >
              Save Widget
            </Button>

            <Tooltip title="Advanced Export">
              <Button 
                icon={<SettingOutlined />} 
                onClick={() => setActionsVisible(true)}
                className="db-toolbar-btn"
              />
            </Tooltip>
          </Space>
        </div>

        {/* Designer Body with Left Sidebar & Canvas */}
        <div className="db-designer-body">
          <PivotSidebar
            tables={tables}
            fields={availableFields}
            selectedTable={selectedTable}
            onTableChange={handleTableChange}
            selectedFields={allSelectedFields}
            loading={loading}
            tableError={!!validationError && !selectedTable}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />

          <div className="db-canvas-area">
            {sidebarCollapsed && (
              <div className="db-canvas-reopen-wrap">
                <Button
                  size="small"
                  icon={<MenuUnfoldOutlined />}
                  onClick={() => setSidebarCollapsed(false)}
                  className="db-canvas-reopen-btn"
                >
                  Show Available Fields
                </Button>
              </div>
            )}

            {validationError && (
              <Alert
                type="warning"
                message={validationError}
                showIcon
                closable
                onClose={() => setValidationError(null)}
                className="db-canvas-alert"
              />
            )}

            <div className="db-canvas-header">
              <div>
                <div className="db-canvas-title-group">
                  <span className="db-canvas-title">
                    {reportName || (editingReport ? (editingReport.tpsr_report_name || 'Edit Widget') : 'New Data Widget')}
                  </span>
                  {selectedTable && (
                    <Tag color="blue" className="db-canvas-table-tag">
                      {selectedTable}
                    </Tag>
                  )}
                </div>
                <div className="db-canvas-subtitle">
                  {selectedTable
                    ? `Source View: ${selectedTable} • Drag fields into the drop zones below`
                    : 'Select a database view on the left to inspect columns and configure your widget'}
                </div>
              </div>
              {showResults && (
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={handleExportExcel}
                  className="db-canvas-export-btn"
                >
                  Export Excel
                </Button>
              )}
            </div>

            <PivotDropZones 
              zones={zones} 
              onRemoveItem={handleRemoveItem} 
              onUpdateItem={handleUpdateItem}
              tableName={selectedTable}
            />

            {showResults && (
              <div className="db-live-preview-card">
                <div className={`db-live-preview-header${!previewOpen ? ' is-collapsed' : ''}`}>
                  <div className="db-live-preview-title-group">
                    <TableOutlined className="db-live-preview-title-icon" />
                    <span className="db-live-preview-title-text">
                      Live Preview
                    </span>
                    <Tag
                      color={resultView === 'chart' ? 'blue' : 'default'}
                      className="db-live-preview-tag"
                    >
                      {resultView === 'chart' ? (chartType === 'none' ? 'Table' : chartType.toUpperCase()) : 'TABLE'}
                    </Tag>
                    <span className="db-live-preview-records">
                      ({resultData.length} records)
                    </span>
                  </div>

                  <Space size={8}>
                    <Tooltip title="Refresh Preview">
                      <Button
                        size="small"
                        icon={<ReloadOutlined />}
                        loading={loading}
                        onClick={handleGenerate}
                        className="db-live-preview-btn"
                      />
                    </Tooltip>
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={handleExportExcel}
                      className="db-live-preview-btn"
                    >
                      Export Excel
                    </Button>
                    <Tooltip title={previewOpen ? "Collapse Preview" : "Expand Preview"}>
                      <Button
                        type="text"
                        size="small"
                        icon={previewOpen ? <UpOutlined /> : <DownOutlined />}
                        onClick={() => setPreviewOpen(!previewOpen)}
                        className="db-live-preview-toggle-btn"
                      />
                    </Tooltip>
                  </Space>
                </div>

                {previewOpen && (
                  resultView === 'chart' && chartType !== 'none' ? (
                    <PivotChart
                      type={chartType}
                      data={resultData}
                      rows={zones.rows}
                      columns={zones.columns}
                      values={zones.values}
                      title={reportName}
                      customConfig={zones.customConfig || {}}
                    />
                  ) : (
                    <PivotResultTable
                      data={resultData}
                      zones={zones}
                    />
                  )
                )}
              </div>
            )}
          </div>
        </div>

        <Drawer
          title="Export & Settings"
          placement="right"
          onClose={() => setActionsVisible(false)}
          open={actionsVisible}
          width={320}
        >
          <ActionsPanel
            onSave={handleSaveReport}
            onExport={handleExportExcel}
            onCancel={() => { handleReset(); setActionsVisible(false); }}
          />
        </Drawer>
      </div>

      <DragOverlay>
        {activeField ? (
          <div className="md-pill-preview">
            <span>{activeField.label}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default PivotDashboard;
