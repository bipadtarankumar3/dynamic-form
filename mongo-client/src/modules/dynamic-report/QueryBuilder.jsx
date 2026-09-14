import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Table, Tabs, Typography, Space, Checkbox, Modal, Tooltip, Popconfirm } from 'antd';
import { 
  PlusOutlined, 
  CloseOutlined, 
  PlayCircleOutlined, 
  SaveOutlined, 
  SettingOutlined, 
  RightOutlined,
  TableOutlined,
  FilterOutlined,
  BarChartOutlined,
  DatabaseOutlined,
  DragOutlined,
  FolderOpenOutlined,
  SearchOutlined,
  PlusCircleOutlined,
  InfoCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from '@/hooks/useNextRouter';
import { privateHttpClient } from '@/services/api/httpClient';
import { toast } from 'react-toastify';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import './AzureDevOpsTheme.css';

const { Title, Text } = Typography;

// Available comparison operators for setting filter criteria
const OPERATORS = [
  { label: '=', value: '=' },
  { label: '>', value: '>' },
  { label: '<', value: '<' },
  { label: '>=', value: '>=' },
  { label: '<=', value: '<=' },
  { label: '!=', value: '!=' },
];

/**
 * QueryBuilder Component
 * An interactive, user-friendly interface that allows users to query database views dynamically.
 * Features:
 * - Dynamic view metadata parsing (prefixed with v_).
 * - Drag-and-drop column selection & reordering (native HTML5).
 * - Secure Sorting module with direction toggling and reordering.
 * - DB query configuration persistence (load, save, update saved queries).
 * - Live query runner with clean visual tabular results.
 */
const QueryBuilder = () => {
  // --- Navigation & Routing Hooks ---
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get('id'); // ID of the saved query being edited (if any)

  // --- UI & State Controllers ---
  const [activeTab, setActiveTab] = useState("editor"); // Tabs: "editor", "results", or "charts"
  const [modules, setModules] = useState([]);           // Dynamic views (prefixed with v_) fetched from DB
  const [selectedModule, setSelectedModule] = useState(''); // Current active view selection
  const [parameters, setParameters] = useState([]);     // Available fields/columns for the selected view
  const [loading, setLoading] = useState(false);         // Global spinner handler

  // --- Query Builder Editor Fields ---
  const [filters, setFilters] = useState([
    { logic: '', field: null, operator: '=', value: '' } // List of active query filter rows
  ]);
  const [outputFields, setOutputFields] = useState([]); // Array of column keys to display in results
  const [sortFields, setSortFields] = useState([]);     // Array of sort rules: { field: '', direction: 'asc'|'desc' }
  const [reportData, setReportData] = useState([]);     // Executed report query results

  // --- Save Modal Controllers ---
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false); // Controls naming and saving of the query
  const [queryName, setQueryName] = useState('');                 // Name/Title of the query

  // --- Columns/Sorting Options Modal & Drag-and-Drop Order State ---
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false); // Controls column/sorting configuration options
  const [tempOutputFields, setTempOutputFields] = useState([]);       // Temp fields array being modified in modal
  const [tempSortFields, setTempSortFields] = useState([]);           // Temp sort fields array being modified in modal
  const [draggedIndex, setDraggedIndex] = useState(null);             // Tracks which column index is being dragged
  const [draggedSortIndex, setDraggedSortIndex] = useState(null);     // Tracks which sort field index is being dragged

  // --- Chart Configuration State ---
  const [chartType, setChartType] = useState('column');
  const [chartXAxisField, setChartXAxisField] = useState('');
  const [chartYAxisFields, setChartYAxisFields] = useState([]);
  const [chartTitle, setChartTitle] = useState('Report Analytics');
  const [chartShowLegend, setChartShowLegend] = useState(true);
  const [chartStacking, setChartStacking] = useState('none'); // 'none', 'normal', 'percent'

  // ==========================================
  // 1. Lifecycle & Mounting Side-Effects
  // ==========================================

  // Fetch the initial views (modules) from database on mounting
  useEffect(() => {
    fetchModules();
  }, []);

  // Fetch saved query configuration once views are ready and ID is present in URL
  useEffect(() => {
    if (queryId && modules.length > 0) {
      loadSavedQuery(queryId);
    }
  }, [queryId, modules]);

  // ==========================================
  // 2. HTML5 native Drag & Drop Handlers
  // ==========================================

  // Invoked when user starts dragging a column element
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  };

  // Invoked when dragging over a different index. Swaps elements for instant visual feedback.
  const handleDragOver = (e, index) => {
    e.preventDefault(); // Necessary to allow drop target
    if (draggedIndex === null || draggedIndex === index) return;

    // Swap elements in temp list
    const updatedList = [...tempOutputFields];
    const draggedItem = updatedList[draggedIndex];
    updatedList.splice(draggedIndex, 1);
    updatedList.splice(index, 0, draggedItem);

    setDraggedIndex(index);
    setTempOutputFields(updatedList);
  };

  // Resets drag indices once user finishes drop
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Invoked when user starts dragging a sort field element
  const handleSortDragStart = (e, index) => {
    setDraggedSortIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  };

  // Invoked when dragging over a different sort index. Swaps sort fields for visual feedback.
  const handleSortDragOver = (e, index) => {
    e.preventDefault(); // Required to allow drop target
    if (draggedSortIndex === null || draggedSortIndex === index) return;

    const updatedSorts = [...tempSortFields];
    const draggedItem = updatedSorts[draggedSortIndex];
    updatedSorts.splice(draggedSortIndex, 1);
    updatedSorts.splice(index, 0, draggedItem);

    setDraggedSortIndex(index);
    setTempSortFields(updatedSorts);
  };

  // Resets drag sort index when drop finishes
  const handleSortDragEnd = () => {
    setDraggedSortIndex(null);
  };

  // ==========================================
  // 3. API Integrations
  // ==========================================

  // Fetches list of database views starting with 'v_'
  const fetchModules = async () => {
    setLoading(true);
    try {
      const response = await privateHttpClient.get('dynamic-report/views');
      if (response.data.success) {
        setModules(response.data.data);
        
        // If it's a new query builder (no URL query ID), set the first view as default
        if (!queryId && response.data.data.length > 0) {
          const defaultModule = response.data.data[0].value;
          setSelectedModule(defaultModule);
          fetchMetadata(defaultModule); // Auto-load columns for this view
        }
      }
    } catch (error) {
      toast.error("Error fetching query types");
    } finally {
      setLoading(false);
    }
  };

  // Fetches fields/parameters metadata (columns) for the chosen view/module
  const fetchMetadata = async (moduleName, isLoadedQuery = false) => {
    setLoading(true);
    try {
      const response = await privateHttpClient.get(`dynamic-report/metadata?module=${moduleName}`);
      if (response.data.success) {
        const colsMetadata = response.data.data.parameters;
        setParameters(colsMetadata);
        
        // By default, select and show all columns if this is not a pre-loaded query configuration
        if (!isLoadedQuery) {
          setOutputFields(colsMetadata.map(c => c.value));
        }
      }
    } catch (error) {
      toast.error("Error fetching metadata");
    } finally {
      setLoading(false);
    }
  };

  // Loads parameters, filters, and column preferences of an existing query from DB
  const loadSavedQuery = async (id) => {
    setLoading(true);
    try {
      const response = await privateHttpClient.get('dynamic-report/saved');
      if (response.data.success) {
        const savedQuery = response.data.data.find(q => q.id.toString() === id.toString());
        if (savedQuery && savedQuery.queryData) {
          const { module, filters: savedFilters, outputFields: savedOutputs, sortFields: savedSorts, chartConfig } = savedQuery.queryData;
          
          // Direct state allocation without complex side effects
          setSelectedModule(module);
          
          if (savedFilters && savedFilters.length > 0) {
            setFilters(savedFilters);
          }
          if (savedOutputs && savedOutputs.length > 0) {
            setOutputFields(savedOutputs);
          }
          if (savedSorts && savedSorts.length > 0) {
            setSortFields(savedSorts);
          } else {
            setSortFields([]);
          }
          setQueryName(savedQuery.title || '');

          if (chartConfig) {
            setChartType(chartConfig.type || 'column');
            setChartXAxisField(chartConfig.xAxisField || '');
            setChartYAxisFields(chartConfig.yAxisFields || []);
            setChartTitle(chartConfig.title || 'Report Analytics');
            setChartShowLegend(chartConfig.showLegend !== undefined ? chartConfig.showLegend : true);
            setChartStacking(chartConfig.stacking || 'none');
          } else {
            setChartType('column');
            setChartXAxisField('');
            setChartYAxisFields([]);
            setChartTitle('Report Analytics');
            setChartShowLegend(true);
            setChartStacking('none');
          }
          
          // Fetch fields but specify it is loaded to prevent overwriting outputs
          await fetchMetadata(module, true);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Error loading saved query");
    } finally {
      setLoading(false);
    }
  };

  // Auto-detects and configures default X and Y axis columns for charting
  const autoConfigureChartFields = (data, currentOutputs) => {
    if (!data || data.length === 0) return;
    
    // We only select from the fields currently selected
    const activeCols = currentOutputs.length > 0 ? currentOutputs.filter(f => f) : parameters.map(p => p.value);
    if (activeCols.length === 0) return;

    // Check if current configuration is valid
    const isXValid = activeCols.includes(chartXAxisField);
    const isYValid = chartYAxisFields.length > 0 && chartYAxisFields.every(y => activeCols.includes(y));

    if (isXValid && isYValid) return;

    const numericCols = [];
    const categoryCols = [];

    activeCols.forEach(col => {
      const param = parameters.find(p => p.value === col);
      if (param && param.type === 'number') {
        numericCols.push(col);
      } else {
        categoryCols.push(col);
      }
    });

    let defaultX = chartXAxisField;
    if (!isXValid) {
      defaultX = categoryCols.length > 0 ? categoryCols[0] : activeCols[0];
      setChartXAxisField(defaultX);
    }

    if (!isYValid) {
      let defaultYs = [];
      if (numericCols.length > 0) {
        defaultYs = numericCols;
      } else {
        const fallbackY = activeCols.find(col => col !== defaultX);
        if (fallbackY) {
          defaultYs = [fallbackY];
        } else {
          defaultYs = [activeCols[0]];
        }
      }
      setChartYAxisFields(defaultYs);
    }
  };

  // Executes query dynamically against the selected view, generating result records
  const handleRunQuery = async () => {
    if (!selectedModule) {
      toast.error("Please select a Query Type");
      return;
    }

    // Clean up empty selections inside outputs array
    const validOutputFields = outputFields.filter(f => f);
    if (validOutputFields.length === 0) {
      toast.error("Please select at least one column in Column options");
      return;
    }

    // Prepare filter parameters payload (only send rows that have a field set)
    const activeFilters = filters.filter(f => f.field);
    const activeSorts = sortFields.filter(s => s.field);

    const payload = {
      module: selectedModule,
      parameterFilters: activeFilters,
      outputFields: validOutputFields,
      sortFields: activeSorts
    };

    setLoading(true);
    try {
      const response = await privateHttpClient.post(`dynamic-report/execute`, payload);
      if (response.data.success) {
        const data = response.data.data;
        setReportData(data);
        autoConfigureChartFields(data, validOutputFields);
        setActiveTab("results"); // Navigate directly to "Results" tab to view table
      }
    } catch (error) {
      toast.error("Error executing query");
    } finally {
      setLoading(false);
    }
  };

  // Saves the custom query in the database (Updates if ID exists, else creates new)
  const handleSaveQuery = async () => {
    if (!queryName.trim()) {
      toast.error("Please enter a name for the query");
      return;
    }

    try {
      const payload = {
        id: queryId ? parseInt(queryId) : null,
        title: queryName,
        folder: 'My Queries',
        queryData: { 
          module: selectedModule, 
          filters, 
          outputFields,
          sortFields: sortFields.filter(s => s.field),
          chartConfig: {
            type: chartType,
            xAxisField: chartXAxisField,
            yAxisFields: chartYAxisFields,
            title: chartTitle,
            showLegend: chartShowLegend,
            stacking: chartStacking
          }
        }
      };
      
      const response = await privateHttpClient.post(`dynamic-report/save`, payload);
      if (response.data.success) {
        toast.success(queryId ? "Query updated successfully" : "Query saved successfully");
        setIsSaveModalOpen(false);
      }
    } catch (error) {
      toast.error("Failed to save query");
    }
  };

  // Resets builder state to create a brand new clean query configuration
  const handleNewQuery = () => {
    navigate('/dynamic-report/builder'); // Resets browser query URL parameter
    setFilters([{ logic: '', field: null, operator: '=', value: '' }]); // Clear clause table
    
    // Default to the first available module view and load its metadata
    const defaultModule = modules.length > 0 ? modules[0].value : 'finance';
    setSelectedModule(defaultModule);
    fetchMetadata(defaultModule);

    setSortFields([]);
    setQueryName('');
    setReportData([]);
    
    // Reset chart config state
    setChartType('column');
    setChartXAxisField('');
    setChartYAxisFields([]);
    setChartTitle('Report Analytics');
    setChartShowLegend(true);
    setChartStacking('none');

    setActiveTab("editor"); // Jump back to edit tab
  };

  // ==========================================
  // 4. Editor Table Row Add / Remove / Modify
  // ==========================================

  // Inserts a new filter clause row (with logical And operator) right below the target row
  const addFilterRow = (index) => {
    const updatedFilters = [...filters];
    updatedFilters.splice(index + 1, 0, { logic: 'And', field: null, operator: '=', value: '' });
    setFilters(updatedFilters);
  };

  // Removes a filter clause row at specific index position
  const removeFilterRow = (index) => {
    if (filters.length === 1) return; // Keep at least one row active
    
    const updatedFilters = filters.filter((_, i) => i !== index);
    
    // Ensure that if the very first row was deleted, the new first row has no prefix operator (And/Or)
    if (index === 0 && updatedFilters.length > 0) {
      updatedFilters[0].logic = '';
    }
    
    setFilters(updatedFilters);
  };

  // Updates a key value in the specific filter clause row
  const updateFilter = (index, key, value) => {
    const updatedFilters = [...filters];
    updatedFilters[index][key] = value;
    setFilters(updatedFilters);
  };

  // ==========================================
  // 5. Table Columns Mapping
  // ==========================================

  // Format list of selected column keys into Ant Design column config structure
  const getTableColumns = () => {
    // If output fields are not specified, default to displaying all columns from current metadata parameters
    const activeColumns = outputFields.length > 0 ? outputFields : parameters.map(p => p.value);
    
    return activeColumns.map(colName => {
      const match = parameters.find(p => p.value === colName);
      return {
        title: match ? match.label : colName, // Show nice title label if found, else fallback to raw name
        dataIndex: colName,
        key: colName
      };
    });
  };

  const tableColumns = getTableColumns();

  // Helper to render Highcharts graph dynamically
  const renderChart = () => {
    if (reportData.length === 0) {
      return (
        <div className="empty-state" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', margin: 0 }}>
          <BarChartOutlined style={{ fontSize: '56px', color: '#bfbfbf', marginBottom: '16px' }} />
          <Title level={4} style={{ color: '#262626', margin: '8px 0' }}>No query results available</Title>
          <Text type="secondary" style={{ maxWidth: '360px', margin: '0 auto 20px' }}>
            Run a query first in the Editor tab to populate data, then switch here to generate your chart visualization.
          </Text>
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleRunQuery} className="azure-btn-primary" style={{ width: 'fit-content', alignSelf: 'center' }}>
            Run Query Now
          </Button>
        </div>
      );
    }

    if (!chartXAxisField || chartYAxisFields.length === 0 || !chartYAxisFields[0]) {
      return (
        <div className="empty-state" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', margin: 0 }}>
          <SettingOutlined style={{ fontSize: '56px', color: '#bfbfbf', marginBottom: '16px' }} />
          <Title level={4} style={{ color: '#262626', margin: '8px 0' }}>Configuration Required</Title>
          <Text type="secondary" style={{ maxWidth: '360px', margin: '0 auto 20px' }}>
            Please select both X-Axis and Y-Axis fields in the settings panel to generate your interactive chart.
          </Text>
        </div>
      );
    }

    // Prepare categories (X-Axis values)
    const categories = reportData.map(row => {
      const val = row[chartXAxisField];
      return val !== null && val !== undefined ? String(val) : '';
    });

    let series = [];
    if (chartType === 'pie') {
      const yField = chartYAxisFields[0];
      const match = parameters.find(p => p.value === yField);
      series = [{
        name: match ? match.label : yField,
        colorByPoint: true,
        data: reportData.map(row => {
          const xVal = row[chartXAxisField];
          const yVal = parseFloat(row[yField]);
          return {
            name: xVal !== null && xVal !== undefined ? String(xVal) : '',
            y: isNaN(yVal) ? 0 : yVal
          };
        })
      }];
    } else {
      series = chartYAxisFields.filter(f => f).map(yField => {
        const match = parameters.find(p => p.value === yField);
        return {
          name: match ? match.label : yField,
          data: reportData.map(row => {
            const val = parseFloat(row[yField]);
            return isNaN(val) ? 0 : val;
          })
        };
      });
    }

    const stackingVal = chartStacking === 'none' ? undefined : chartStacking;

    // Harmonious Colors
    const colors = [
      '#0078d4', // Azure Blue
      '#107c41', // Excel Green
      '#d83b01', // Orange
      '#b4009e', // Purple
      '#008272', // Teal
      '#efc11a', // Yellow
      '#002050', // Dark Navy
      '#e3008c'  // Pink
    ];

    const options = {
      chart: {
        type: chartType,
        backgroundColor: '#ffffff',
        style: {
          fontFamily: 'var(--font-body)'
        },
        borderRadius: 12
      },
      title: {
        text: chartTitle || 'Report Analytics',
        align: 'left',
        style: {
          color: '#262626',
          fontSize: '18px',
          fontWeight: '700',
          fontFamily: 'var(--font-display)'
        }
      },
      colors: colors,
      credits: {
        enabled: false
      },
      xAxis: {
        categories: categories,
        crosshair: true,
        labels: {
          style: {
            color: '#595959',
            fontSize: '12px'
          }
        },
        lineColor: '#e8e8e8',
        tickColor: '#e8e8e8'
      },
      yAxis: {
        title: {
          text: chartType === 'pie' ? '' : (chartYAxisFields.length === 1 ? (parameters.find(p => p.value === chartYAxisFields[0])?.label || chartYAxisFields[0]) : 'Values'),
          style: {
            color: '#595959',
            fontSize: '13px',
            fontWeight: '500'
          }
        },
        labels: {
          style: {
            color: '#595959',
            fontSize: '12px'
          }
        },
        gridLineColor: '#f5f5f5',
        lineColor: '#e8e8e8'
      },
      tooltip: {
        shared: chartType !== 'pie',
        headerFormat: '<span style="font-size:12px; font-weight:bold; color:#262626">{point.key}</span><br/>',
        pointFormat: chartType === 'pie' 
          ? '<span style="color:{point.color}">\u25CF</span> {series.name}: <b>{point.percentage:.1f}%</b> ({point.y})<br/>'
          : '<span style="color:{series.color}">\u25CF</span> {series.name}: <b>{point.y}</b><br/>',
        backgroundColor: '#ffffff',
        borderColor: '#e8e8e8',
        borderRadius: 8,
        shadow: true,
        style: {
          fontSize: '13px'
        }
      },
      plotOptions: {
        series: {
          stacking: stackingVal,
          animation: {
            duration: 800
          },
          borderWidth: 0,
          borderRadius: chartType === 'column' || chartType === 'bar' ? 4 : 0,
          marker: {
            enabled: chartType === 'line' || chartType === 'spline' || chartType === 'area',
            radius: 4,
            symbol: 'circle'
          }
        },
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: {
            enabled: true,
            format: '<b>{point.name}</b>: {point.percentage:.1f} %',
            style: {
              fontSize: '12px',
              color: '#262626',
              textOutline: 'none'
            }
          },
          showInLegend: true
        }
      },
      legend: {
        enabled: chartShowLegend,
        itemStyle: {
          color: '#595959',
          fontWeight: '500',
          fontSize: '12px'
        },
        itemHoverStyle: {
          color: '#0078d4'
        }
      },
      series: series
    };

    return (
      <div style={{ padding: '8px', background: '#fff', borderRadius: '12px' }}>
        <HighchartsReact highcharts={Highcharts} options={options} />
      </div>
    );
  };

  // ==========================================
  // 6. JSX UI layout
  // ==========================================
  return (
    <div className="azure-devops-container">
      {/* Top Header Breadcrumbs & Controls */}
      <div className="azure-header">
        <div className="azure-header-breadcrumbs">
          <FolderOpenOutlined style={{ color: '#0078d4', fontSize: '18px', marginRight: '4px' }} />
          <span className="breadcrumb-item" onClick={() => navigate('/dynamic-report')}>Queries</span>
          <RightOutlined className="breadcrumb-separator" />
          <span style={{ color: '#262626' }}>My Queries</span>
        </div>
        <Space size="middle">
          <Button 
            type="primary" 
            icon={<PlayCircleOutlined />} 
            className="azure-btn-primary" 
            onClick={handleRunQuery} 
            loading={loading}
          >
            Run query
          </Button>
          <Button 
            className="azure-btn-secondary" 
            icon={<PlusCircleOutlined />}
            onClick={handleNewQuery}
          >
            New Query
          </Button>
          <Button 
            className="azure-btn-secondary" 
            icon={<SaveOutlined />} 
            onClick={() => setIsSaveModalOpen(true)}
          >
            Save
          </Button>
          <Button 
            className="azure-btn-secondary" 
            icon={<SettingOutlined />} 
            onClick={() => {
              setTempOutputFields([...outputFields]); // Backup current outputs list
              setTempSortFields([...sortFields]);     // Backup current sort list
              setIsColumnModalOpen(true);
            }}
          >
            Column options
          </Button>
        </Space>
      </div>

      {/* Main Tab Panel Section */}
      <div className="azure-content">
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab} 
          className="azure-tabs"
          items={[
            {
              key: "results",
              label: (
                <span>
                  <TableOutlined style={{ fontSize: '16px', marginRight: '6px' }} />
                  Results
                </span>
              ),
              children: (
                reportData.length > 0 ? (
              <Table 
                dataSource={reportData} 
                columns={tableColumns} 
                className="azure-table"
                pagination={false}
                rowKey={(record) => record.id || record.key || JSON.stringify(record)}
              />
            ) : (
              <div className="empty-state">
                <SearchOutlined style={{ fontSize: '56px', color: '#bfbfbf', marginBottom: '16px' }} />
                <Title level={4} style={{ color: '#262626', margin: '8px 0' }}>Ready to analyze your data</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: '24px', maxWidth: '360px', margin: '0 auto 20px' }}>
                  Select your query parameters in the Editor tab and click "Run query" at the top to fetch results.
                </Text>
                <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleRunQuery} className="azure-btn-primary">
                  Run Query Now
                </Button>
              </div>
            )
            ),
            },
            {
              key: "editor",
              label: (
                <span>
                  <FilterOutlined style={{ fontSize: '16px', marginRight: '6px' }} />
                  Query Editor
                </span>
              ),
              children: (
                <>
                  {/* Step Selector for Datasource View */}
            <div style={{ 
              background: '#f0f5ff', 
              padding: '16px 24px', 
              borderRadius: '12px', 
              border: '1px solid #adc6ff', 
              marginBottom: '20px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.01)'
            }}>
              <DatabaseOutlined style={{ color: '#2f54eb', fontSize: '24px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: '#2f54eb', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Step 1: Select Database View
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1f1f1f' }}>Select view model to query:</span>
                  <Select 
                    showSearch
                    filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                    className="azure-select" 
                    value={selectedModule} 
                    onChange={(value) => {
                      setSelectedModule(value);
                      fetchMetadata(value); // Reload fields list when module/view changes
                    }}
                    options={modules}
                    style={{ width: 260 }}
                    placeholder="Choose a source view..."
                  />
                  <Checkbox style={{ color: '#595959', marginLeft: '12px' }}>Query across multiple projects</Checkbox>
                </div>
              </div>
            </div>

            {/* Filter Rows Table Header Card */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginTop: '24px',
              marginBottom: '12px',
              fontFamily: 'var(--font-display)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FilterOutlined style={{ color: '#0078d4' }} />
                <span style={{ fontWeight: 700, fontSize: '15px', color: '#262626' }}>Step 2: Add Filters</span>
                <Tooltip title="Filters restrict your search to matching records only. Enter matching values in the fields below.">
                  <InfoCircleOutlined style={{ color: '#8c8c8c', cursor: 'help', fontSize: '13px' }} />
                </Tooltip>
              </div>
            </div>

            {/* Structured Table for editing logic rows */}
            <div className="azure-filter-table">
              {/* Table labels headers */}
              <div className="azure-filter-row azure-filter-header">
                <div style={{ width: 60 }}></div>
                <div style={{ width: 100 }}>And/Or</div>
                <div style={{ width: 250 }}><DatabaseOutlined style={{ marginRight: '6px' }} />Field *</div>
                <div style={{ width: 150 }}>Operator</div>
                <div style={{ flex: 1 }}>Value</div>
              </div>

              {/* Loop rendering clause editor rows list */}
              {filters.map((filter, index) => (
                <div className="azure-filter-row" key={index}>
                  {/* Action buttons list */}
                  <div style={{ width: 60, display: 'flex', gap: 8 }}>
                    <PlusOutlined className="icon-btn add" onClick={() => addFilterRow(index)} />
                    {filters.length > 1 && (
                      <CloseOutlined className="icon-btn remove" onClick={() => removeFilterRow(index)} />
                    )}
                  </div>
                  
                  {/* Logical operator selector (And/Or) */}
                  <div style={{ width: 100 }}>
                    {index === 0 ? (
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        background: '#e6f7ff', 
                        color: '#0050b3', 
                        fontWeight: 600, 
                        padding: '4px 12px', 
                        borderRadius: '6px',
                        fontSize: '13px',
                        border: '1px solid #91d5ff',
                        width: '76px',
                        height: '32px',
                        fontFamily: 'var(--font-display)'
                      }}>
                        Where
                      </span>
                    ) : (
                      <Select 
                        className="azure-select" 
                        style={{ width: '100%' }}
                        value={filter.logic}
                        onChange={(val) => updateFilter(index, 'logic', val)}
                        options={[{ label: 'And', value: 'And' }, { label: 'Or', value: 'Or' }]}
                      />
                    )}
                  </div>

                  {/* Available Database Fields Selector */}
                  <div style={{ width: 250 }}>
                    <Select
                      showSearch
                      filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                      className="azure-select"
                      style={{ width: '100%' }}
                      placeholder="Select field"
                      value={filter.field}
                      onChange={(val) => updateFilter(index, 'field', val)}
                      options={parameters}
                    />
                  </div>

                  {/* Match criteria operator selector */}
                  <div style={{ width: 150 }}>
                    <Select
                      className="azure-select"
                      style={{ width: '100%' }}
                      value={filter.operator}
                      onChange={(val) => updateFilter(index, 'operator', val)}
                      options={OPERATORS}
                    />
                  </div>

                  {/* Value criteria input textbox */}
                  <div style={{ flex: 1 }}>
                    <Input 
                      className="azure-input"
                      placeholder="Enter match criteria value" 
                      value={filter.value}
                      onChange={(e) => updateFilter(index, 'value', e.target.value)}
                    />
                  </div>
                </div>
              ))}
              
              {/* Quick Append Row Control */}
              <div style={{ marginTop: 16 }}>
                 <Button 
                   type="dashed" 
                   style={{ borderRadius: '8px', borderStyle: 'dashed' }} 
                   icon={<PlusOutlined />} 
                   onClick={() => addFilterRow(filters.length - 1)}
                 >
                   Add New Filter Clause
                 </Button>
              </div>
            </div>
                </>
            ),
            },
            {
              key: "charts",
              label: (
                <span>
                  <BarChartOutlined style={{ fontSize: '16px', marginRight: '6px' }} />
                  Chart View
                </span>
              ),
              children: (
            <div className="chart-builder-layout">
              {/* Left Side: Configuration Card */}
              <div className="chart-settings-sidebar">
                <Title level={5} style={{ marginBottom: 4, paddingBottom: 8, borderBottom: '1px solid var(--border-color)', color: '#262626' }}>
                  <SettingOutlined style={{ marginRight: 8, color: '#0078d4' }} />
                  Chart Settings
                </Title>
                
                <div className="setting-group">
                  <label className="setting-label">Chart Type</label>
                  <Select
                    className="azure-select"
                    style={{ width: '100%' }}
                    value={chartType}
                    onChange={(val) => {
                      setChartType(val);
                      // Clear Y field arrays if type is changed to pie, to ensure single selection
                      if (val === 'pie') {
                        setChartYAxisFields(prev => prev.slice(0, 1));
                      }
                    }}
                    options={[
                      { label: 'Column Chart', value: 'column' },
                      { label: 'Bar Chart', value: 'bar' },
                      { label: 'Line Chart', value: 'line' },
                      { label: 'Spline Chart', value: 'spline' },
                      { label: 'Area Chart', value: 'area' },
                      { label: 'Pie Chart', value: 'pie' }
                    ]}
                  />
                </div>

                <div className="setting-group">
                  <label className="setting-label">Chart Title</label>
                  <Input
                    className="azure-input"
                    placeholder="Enter chart title"
                    value={chartTitle}
                    onChange={(e) => setChartTitle(e.target.value)}
                  />
                </div>

                <div className="setting-group">
                  <label className="setting-label">X-Axis Field (Categories)</label>
                  <Select
                    className="azure-select"
                    style={{ width: '100%' }}
                    placeholder="Select category field"
                    value={chartXAxisField}
                    onChange={setChartXAxisField}
                    options={outputFields.map(f => {
                      const match = parameters.find(p => p.value === f);
                      return { label: match ? match.label : f, value: f };
                    })}
                  />
                </div>

                {chartType !== 'pie' ? (
                  <div className="setting-group">
                    <label className="setting-label">Y-Axis Field(s) (Values)</label>
                    <Select
                      mode="multiple"
                      allowClear
                      className="azure-select"
                      style={{ width: '100%' }}
                      placeholder="Select value fields"
                      value={chartYAxisFields}
                      onChange={setChartYAxisFields}
                      options={outputFields.map(f => {
                        const match = parameters.find(p => p.value === f);
                        const isNum = match && match.type === 'number';
                        return { 
                          label: match ? `${match.label} ${isNum ? '(123)' : ''}` : f, 
                          value: f 
                        };
                      })}
                    />
                  </div>
                ) : (
                  <div className="setting-group">
                    <label className="setting-label">Y-Axis Field (Value)</label>
                    <Select
                      className="azure-select"
                      style={{ width: '100%' }}
                      placeholder="Select value field"
                      value={chartYAxisFields[0]}
                      onChange={(val) => setChartYAxisFields(val ? [val] : [])}
                      options={outputFields.map(f => {
                        const match = parameters.find(p => p.value === f);
                        const isNum = match && match.type === 'number';
                        return { 
                          label: match ? `${match.label} ${isNum ? '(123)' : ''}` : f, 
                          value: f 
                        };
                      })}
                    />
                  </div>
                )}

                {['column', 'bar', 'area'].includes(chartType) && (
                  <div className="setting-group">
                    <label className="setting-label">Stacking Mode</label>
                    <Select
                      className="azure-select"
                      style={{ width: '100%' }}
                      value={chartStacking}
                      onChange={setChartStacking}
                      options={[
                        { label: 'None', value: 'none' },
                        { label: 'Normal', value: 'normal' },
                        { label: 'Percent', value: 'percent' }
                      ]}
                    />
                  </div>
                )}

                <div className="setting-group" style={{ marginTop: 12 }}>
                  <Checkbox 
                    checked={chartShowLegend} 
                    onChange={(e) => setChartShowLegend(e.target.checked)}
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Show Chart Legend
                  </Checkbox>
                </div>
              </div>

              {/* Right Side: Chart Visualizer */}
              <div className="chart-viz-container">
                {renderChart()}
              </div>
            </div>
            )
            }
          ]}
        />
      </div>

      {/* Save query naming modal dialog */}
      <Modal 
        className="query-builder-modal"
        title={
          <span>
            <SaveOutlined style={{ color: '#0078d4', marginRight: '8px' }} />
            Save Query Configuration
          </span>
        } 
        open={isSaveModalOpen} 
        onOk={handleSaveQuery} 
        onCancel={() => setIsSaveModalOpen(false)}
      >
        <div style={{ marginBottom: '16px' }}>
          <Text type="secondary">Give this query configuration a recognizable name. You can reload this query anytime from the Query List page.</Text>
        </div>
        <Input 
          placeholder="e.g. Active Users Chhattisgarh Region" 
          value={queryName} 
          onChange={(e) => setQueryName(e.target.value)} 
          style={{ height: '40px', borderRadius: '8px' }}
        />
      </Modal>

      {/* Columns/Sorting custom configuration modal dialog */}
      <Modal 
        className="query-builder-modal"
        title={
          <span>
            <SettingOutlined style={{ color: '#0078d4', marginRight: '8px' }} />
            Configure Display Columns & Sorting
          </span>
        } 
        open={isColumnModalOpen} 
        onOk={() => {
          setOutputFields(tempOutputFields);
          setSortFields(tempSortFields);
          setIsColumnModalOpen(false);
        }} 
        onCancel={() => {
          setTempOutputFields(outputFields);
          setTempSortFields(sortFields);
          setIsColumnModalOpen(false);
        }}
        width={520}
      >
        <div style={{ marginBottom: 20 }}>
          <Text type="secondary">
            Add, remove, or reorder display columns and sorting rules. Drag rows by the grab handle <DragOutlined /> to prioritize them.
          </Text>
        </div>
        <Tabs 
          defaultActiveKey="1"
          items={[
            {
              key: "1",
              label: (
                <span>
                  <TableOutlined style={{ marginRight: '6px' }} />
                  Columns
                </span>
              ),
              children: (
                <>
                  <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
              {tempOutputFields.map((field, index) => (
                <div 
                  key={index} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  style={{ 
                    display: 'flex', 
                    gap: 12, 
                    marginBottom: 10, 
                    alignItems: 'center',
                    opacity: draggedIndex === index ? 0.4 : 1,
                    backgroundColor: draggedIndex === index ? 'hsl(208, 100%, 98%)' : '#fff',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: draggedIndex === index ? '1px dashed #0078d4' : '1px solid #e8e8e8',
                    boxShadow: draggedIndex === index ? '0 4px 12px rgba(0, 120, 212, 0.1)' : '0 2px 4px rgba(0,0,0,0.02)',
                    transition: 'all 0.2s ease',
                    cursor: 'grab'
                  }}
                >
                  {/* Grab handle indicator icon */}
                  <DragOutlined className="drag-icon-handle" style={{ fontSize: '15px', color: '#bfbfbf', marginRight: '4px' }} />
                  
                  {/* Column Select Dropdown Picker */}
                  <Select
                    showSearch
                    filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                    style={{ flex: 1 }}
                    value={field}
                    onChange={(val) => {
                      const newFields = [...tempOutputFields];
                      newFields[index] = val;
                      setTempOutputFields(newFields);
                    }}
                    options={parameters}
                    placeholder="Choose column field..."
                    getPopupContainer={() => document.body}
                    styles={{ popup: { root: { zIndex: 9999 } } }}
                  />
                  
                  {/* Delete Column button wrapped in confirmation popover */}
                  <Popconfirm
                    title="Remove Column"
                    description="Are you sure you want to remove this column from results?"
                    onConfirm={() => {
                      const newFields = tempOutputFields.filter((_, i) => i !== index);
                      setTempOutputFields(newFields);
                    }}
                    okText="Yes"
                    cancelText="No"
                    placement="topRight"
                  >
                    <CloseOutlined 
                      className="icon-btn remove" 
                      style={{ fontSize: '15px', padding: '6px', color: '#ff4d4f' }}
                    />
                  </Popconfirm>
                </div>
              ))}
            </div>
            
            {/* Add column selection control button */}
            <Button 
              type="text" 
              style={{ color: '#0078d4', marginTop: 12, fontWeight: 500 }} 
              icon={<PlusOutlined />}
              onClick={() => setTempOutputFields([...tempOutputFields, null])}
            >
              Add a column
            </Button>
                </>
            ),
            },
            {
              key: "2",
              label: (
                <span>
                  <SettingOutlined style={{ marginRight: '6px' }} />
                  Sorting
                </span>
              ),
              children: (
                <>
                  <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
              {tempSortFields.map((fieldObj, index) => (
                <div 
                  key={index} 
                  draggable
                  onDragStart={(e) => handleSortDragStart(e, index)}
                  onDragOver={(e) => handleSortDragOver(e, index)}
                  onDragEnd={handleSortDragEnd}
                  style={{ 
                    display: 'flex', 
                    gap: 12, 
                    marginBottom: 10, 
                    alignItems: 'center',
                    opacity: draggedSortIndex === index ? 0.4 : 1,
                    backgroundColor: draggedSortIndex === index ? 'hsl(208, 100%, 98%)' : '#fff',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: draggedSortIndex === index ? '1px dashed #0078d4' : '1px solid #e8e8e8',
                    boxShadow: draggedSortIndex === index ? '0 4px 12px rgba(0, 120, 212, 0.1)' : '0 2px 4px rgba(0,0,0,0.02)',
                    transition: 'all 0.2s ease',
                    cursor: 'grab'
                  }}
                >
                  {/* Grab handle indicator icon */}
                  <DragOutlined className="drag-icon-handle" style={{ fontSize: '15px', color: '#bfbfbf', marginRight: '4px' }} />
                  
                  {/* Column Select Dropdown Picker */}
                  <Select
                    showSearch
                    filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                    style={{ flex: 1 }}
                    value={fieldObj.field}
                    onChange={(val) => {
                      const newSorts = [...tempSortFields];
                      newSorts[index].field = val;
                      setTempSortFields(newSorts);
                    }}
                    options={parameters}
                    placeholder="Choose sort field..."
                    getPopupContainer={() => document.body}
                    styles={{ popup: { root: { zIndex: 9999 } } }}
                  />
                  
                  {/* Toggle direction button (Up/Down arrow) */}
                  <Button 
                    type="text"
                    icon={fieldObj.direction === 'desc' ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
                    onClick={() => {
                      const newSorts = [...tempSortFields];
                      newSorts[index].direction = newSorts[index].direction === 'desc' ? 'asc' : 'desc';
                      setTempSortFields(newSorts);
                    }}
                    style={{ 
                      fontSize: '15px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: '#0078d4',
                      background: 'hsl(208, 100%, 97%)',
                      borderRadius: '6px',
                      width: '32px',
                      height: '32px',
                      padding: 0
                    }}
                  />
                  
                  {/* Delete Sort row button wrapped in confirmation popover */}
                  <Popconfirm
                    title="Remove Sorting Rule"
                    description="Are you sure you want to remove this sorting field?"
                    onConfirm={() => {
                      const newSorts = tempSortFields.filter((_, i) => i !== index);
                      setTempSortFields(newSorts);
                    }}
                    okText="Yes"
                    cancelText="No"
                    placement="topRight"
                  >
                    <CloseOutlined 
                      className="icon-btn remove" 
                      style={{ fontSize: '15px', padding: '6px', color: '#ff4d4f' }}
                    />
                  </Popconfirm>
                </div>
              ))}
            </div>
            
            {/* Add sort column button */}
            <Button 
              type="text" 
              style={{ color: '#0078d4', marginTop: 12, fontWeight: 500 }} 
              icon={<PlusOutlined />}
              onClick={() => setTempSortFields([...tempSortFields, { field: null, direction: 'asc' }])}
            >
              Add a column
            </Button>
                </>
            )
            }
          ]}
        />
      </Modal>
    </div>
  );
};

export default QueryBuilder;
