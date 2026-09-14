import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Table,
  Input,
  Select,
  Switch,
  Space,
  Tag,
  Typography,
  Card,
  Popconfirm,
  App,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  FilterOutlined,
  InfoCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import { getColumns, getTables } from '@/services/pivot-service';

const { Text, Title } = Typography;

const ConfigureFiltersModal = ({
  open,
  onClose,
  canvasWidgets = [],
  currentFilters = [],
  onSaveFilters,
}) => {
  const { message } = App.useApp();
  const [filtersList, setFiltersList] = useState([]);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [allTables, setAllTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [selectedCol, setSelectedCol] = useState('');
  const [selectedLabelCol, setSelectedLabelCol] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [isMulti, setIsMulti] = useState(true);
  const [filterType, setFilterType] = useState('select'); // 'select' | 'date_range' | 'date'
  const [dependsOn, setDependsOn] = useState('');
  const [parentMatchField, setParentMatchField] = useState('');
  const [loadingCols, setLoadingCols] = useState(false);

  // Extract unique table/view names from placed canvas widgets
  const widgetTables = [...new Set(canvasWidgets.map((w) => w.table_name).filter(Boolean))];

  const [editingIndex, setEditingIndex] = useState(null);

  const fetchAllTables = async () => {
    try {
      const res = await getTables();
      if (res.data?.status && Array.isArray(res.data.data)) {
        setAllTables(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load views list', err);
    }
  };

  useEffect(() => {
    fetchAllTables();
  }, []);

  // Combined tables/views list
  const combinedTables = [
    ...widgetTables,
    ...allTables
      .map((t) => (typeof t === 'string' ? t : t.id || t.table_name || t.name))
      .filter(Boolean)
      .filter((t) => !widgetTables.includes(t)),
  ];

  useEffect(() => {
    if (open) {
      setFiltersList(Array.isArray(currentFilters) ? [...currentFilters] : []);
      if (allTables.length === 0) {
        fetchAllTables();
      }
      const initialTable = selectedTable || widgetTables[0] || (combinedTables.length > 0 ? combinedTables[0] : '');
      setSelectedTable(initialTable);
      if (initialTable) {
        loadColumnsForTable(initialTable);
      }
      setDependsOn('');
      setParentMatchField('');
      setEditingIndex(null);
    }
  }, [open, allTables.length]);

  const loadColumnsForTable = async (tableName) => {
    if (!tableName) {
      setAvailableColumns([]);
      return;
    }
    setLoadingCols(true);
    try {
      const res = await getColumns(tableName);
      if (res.data?.status && Array.isArray(res.data.data)) {
        setAvailableColumns(res.data.data);
      } else {
        setAvailableColumns([]);
      }
    } catch (err) {
      console.error('Failed to load columns for table:', tableName, err);
      setAvailableColumns([]);
    } finally {
      setLoadingCols(false);
    }
  };

  const handleTableChange = (val) => {
    setSelectedTable(val);
    setSelectedCol('');
    setSelectedLabelCol('');
    setCustomLabel('');
    setFilterType('select');
    setDependsOn('');
    setParentMatchField('');
    loadColumnsForTable(val);
  };

  const handleAddOrUpdateFilter = () => {
    if (!selectedTable) {
      message.error('Please select a Database View');
      return;
    }
    if (!selectedCol) {
      message.error('Please select a Value / Filter Column');
      return;
    }

    const matchedCol = availableColumns.find((c) => c.id === selectedCol);
    const label = customLabel.trim() || matchedCol?.label || selectedCol.replace(/_/g, ' ').toUpperCase();

    const isDateCol =
      matchedCol?.type === 'date' ||
      selectedCol.endsWith('_at') ||
      selectedCol.endsWith('_date') ||
      selectedCol === 'date';

    const effectiveFilterType = filterType || (isDateCol ? 'date_range' : 'select');

    const filterKey = `${selectedTable}__${selectedCol}__${label.toLowerCase().replace(/\s+/g, '_')}`;

    const newFilter = {
      id: filterKey,
      filter_key: filterKey,
      field: selectedCol,
      label_field: effectiveFilterType === 'date_range' ? selectedCol : (selectedLabelCol || selectedCol),
      label,
      table_name: selectedTable,
      is_multi: effectiveFilterType === 'date_range' ? false : isMulti,
      depends_on: dependsOn || null,
      parent_match_field: dependsOn ? (parentMatchField || null) : null,
      type: effectiveFilterType === 'date_range' ? 'date_range' : (matchedCol?.type || 'text'),
      filter_type: effectiveFilterType,
    };

    if (editingIndex !== null && editingIndex >= 0 && editingIndex < filtersList.length) {
      const updated = [...filtersList];
      updated[editingIndex] = newFilter;
      setFiltersList(updated);
      message.success(`Updated "${label}" filter`);
      setEditingIndex(null);
    } else {
      const existingIndex = filtersList.findIndex(
        (f) =>
          f.filter_key === filterKey ||
          f.id === filterKey ||
          (f.field === selectedCol && f.table_name === selectedTable && f.label === label)
      );

      if (existingIndex >= 0) {
        const updated = [...filtersList];
        updated[existingIndex] = newFilter;
        setFiltersList(updated);
        message.success(`Updated "${label}" filter`);
      } else {
        setFiltersList([...filtersList, newFilter]);
        message.success(`Added "${label}" filter`);
      }
    }

    setSelectedCol('');
    setSelectedLabelCol('');
    setCustomLabel('');
    setFilterType('select');
    setDependsOn('');
    setParentMatchField('');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setSelectedCol('');
    setSelectedLabelCol('');
    setCustomLabel('');
    setFilterType('select');
    setDependsOn('');
    setParentMatchField('');
  };

  const handleEditFilter = (filter, index) => {
    setEditingIndex(index);
    setSelectedTable(filter.table_name);
    loadColumnsForTable(filter.table_name);
    setSelectedCol(filter.field);
    setSelectedLabelCol(filter.label_field || filter.field);
    setCustomLabel(filter.label);
    setIsMulti(filter.is_multi ?? true);
    setFilterType(
      filter.filter_type ||
      (filter.type === 'date_range' ? 'date_range' : filter.type === 'date' ? 'date' : 'select')
    );
    setDependsOn(filter.depends_on || '');
    setParentMatchField(filter.parent_match_field || '');
  };

  const handleRemoveFilter = (index) => {
    const updated = [...filtersList];
    updated.splice(index, 1);
    setFiltersList(updated);
  };

  const handleMoveUp = (index) => {
    if (index <= 0) return;
    const updated = [...filtersList];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setFiltersList(updated);
  };

  const handleMoveDown = (index) => {
    if (index >= filtersList.length - 1) return;
    const updated = [...filtersList];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setFiltersList(updated);
  };

  const handleToggleMulti = (index, val) => {
    const updated = [...filtersList];
    updated[index] = { ...updated[index], is_multi: val };
    setFiltersList(updated);
  };

  const handleSave = () => {
    let finalFilters = [...filtersList];

    // If user filled form fields but didn't click '+ Add', auto-commit it
    if (selectedTable && selectedCol) {
      const matchedCol = availableColumns.find((c) => c.id === selectedCol);
      const isDateCol =
        matchedCol?.type === 'date' ||
        selectedCol.endsWith('_at') ||
        selectedCol.endsWith('_date') ||
        selectedCol === 'date';
      const effectiveFilterType = filterType || (isDateCol ? 'date_range' : 'select');

      const label =
        customLabel.trim() ||
        matchedCol?.label ||
        selectedCol.replace(/_/g, ' ').toUpperCase();

      const filterKey = `${selectedTable}__${selectedCol}__${label.toLowerCase().replace(/\s+/g, '_')}`;

      const pendingFilter = {
        id: filterKey,
        filter_key: filterKey,
        field: selectedCol,
        label_field: effectiveFilterType === 'date_range' ? selectedCol : (selectedLabelCol || selectedCol),
        label,
        table_name: selectedTable,
        is_multi: effectiveFilterType === 'date_range' ? false : isMulti,
        type: effectiveFilterType === 'date_range' ? 'date_range' : (matchedCol?.type || 'text'),
        filter_type: effectiveFilterType,
      };

      const existingIndex = finalFilters.findIndex(
        (f) =>
          f.filter_key === filterKey ||
          f.id === filterKey ||
          (f.field === selectedCol && f.table_name === selectedTable && f.label === label)
      );

      if (existingIndex >= 0) {
        finalFilters[existingIndex] = pendingFilter;
      } else {
        finalFilters.push(pendingFilter);
      }
    }

    onSaveFilters(finalFilters);
    onClose();
  };

  const tableSelectOptions = combinedTables.map((tbl) => {
    const matched = allTables.find((t) => (typeof t === 'object' ? (t.id === tbl || t.table_name === tbl) : t === tbl));
    return {
      label: matched?.label && matched.label !== tbl ? `${matched.label} (${tbl})` : tbl,
      value: tbl,
    };
  });

  const columnSelectOptions = availableColumns.map((col) => ({
    label: `${col.label || col.id} (${col.type})`,
    value: col.id,
  }));

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FilterOutlined style={{ color: '#15803d', fontSize: '18px' }} />
          <span style={{ fontSize: '16px', fontWeight: 600 }}>Configure Top Dynamic Filters</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={1050}
      style={{ top: 30 }}
      footer={[
        <Button key="cancel" size="large" onClick={onClose} style={{ borderRadius: 6 }}>
          Cancel
        </Button>,
        <Button
          key="save"
          type="primary"
          size="large"
          onClick={handleSave}
          style={{ background: '#15803d', borderColor: '#15803d', fontWeight: 600, borderRadius: 6 }}
        >
          Save Filters ({filtersList.length})
        </Button>,
      ]}
    >
      <div style={{ marginBottom: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 16px', borderRadius: 8 }}>
        <Text style={{ fontSize: '13px', color: '#166534' }}>
          Configure top filters for the dashboard header. You can choose a <b>Value / ID Column</b> (for SQL filtering) and an optional <b>Display / Label Column</b> (to show human-readable text like District Name or State Name).
        </Text>
      </div>

      {/* Add / Edit Filter Card */}
      <Card
        size="small"
        style={{
          background: editingIndex !== null ? '#f0fdf4' : '#ffffff',
          border: editingIndex !== null ? '1.5px solid #86efac' : '1px solid #cbd5e1',
          borderRadius: 8,
          marginBottom: '20px',
          padding: '12px 14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '12px', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{editingIndex !== null ? `✏️ Edit Filter: ${customLabel || 'Selected'}` : '+ Add Filter Column'}</span>
          {editingIndex !== null && (
            <Tag color="green" style={{ fontWeight: 600 }}>
              Editing Item #{editingIndex + 1}
            </Tag>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1.2', minWidth: '180px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>DATABASE VIEW</span>
            <Select
              showSearch
              placeholder="Select Database View"
              value={selectedTable || undefined}
              onChange={handleTableChange}
              style={{ width: '100%' }}
              popupMatchSelectWidth={false}
              options={tableSelectOptions}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </div>

          <div style={{ flex: '1.1', minWidth: '170px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
              {filterType === 'date_range' ? 'DATE COLUMN (FROM - TO)' : filterType === 'date' ? 'DATE COLUMN' : 'VALUE / ID COLUMN'}
            </span>
            <Select
              showSearch
              placeholder={loadingCols ? 'Loading...' : 'Select Column'}
              value={selectedCol || undefined}
              onChange={(val) => {
                setSelectedCol(val);
                const col = availableColumns.find((c) => c.id === val);
                const isDate =
                  col?.type === 'date' ||
                  val.endsWith('_at') ||
                  val.endsWith('_date') ||
                  val === 'date';

                if (isDate) {
                  setFilterType('date_range');
                }

                if (col) {
                  setCustomLabel(col.label || col.id.replace(/_/g, ' ').toUpperCase());
                }
                if (!selectedLabelCol) {
                  const nameCol = availableColumns.find(
                    (c) => c.id.toLowerCase().includes('name') || c.id.toLowerCase().includes('title')
                  );
                  if (nameCol) {
                    setSelectedLabelCol(nameCol.id);
                  } else {
                    setSelectedLabelCol(val);
                  }
                }
              }}
              loading={loadingCols}
              style={{ width: '100%' }}
              disabled={!selectedTable || loadingCols}
              options={columnSelectOptions}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </div>

          <div style={{ flex: '1.1', minWidth: '170px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>FILTER TYPE</span>
            <Select
              value={filterType}
              onChange={setFilterType}
              style={{ width: '100%' }}
              options={[
                { label: '📅 Date Range (From - To)', value: 'date_range' },
                { label: '📋 Dropdown Select', value: 'select' },
                { label: '🗓️ Single Date Picker', value: 'date' },
              ]}
            />
          </div>

          <div style={{ flex: '1', minWidth: '140px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>FILTER TITLE</span>
            <Input
              placeholder="e.g. Visit Date"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          {filterType === 'select' && (
            <>
              <div style={{ flex: '1', minWidth: '160px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>DISPLAY LABEL COLUMN</span>
                <Select
                  showSearch
                  placeholder={loadingCols ? 'Loading...' : 'Display Label Column'}
                  value={selectedLabelCol || undefined}
                  onChange={setSelectedLabelCol}
                  loading={loadingCols}
                  style={{ width: '100%' }}
                  disabled={!selectedTable || loadingCols}
                  options={columnSelectOptions}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '70px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>MULTI-SELECT</span>
                <Switch checked={isMulti} onChange={setIsMulti} size="default" />
              </div>
            </>
          )}
        </div>

        {/* Cascading Parent Dependency Config + Submit Button Row */}
        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #e2e8f0', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
            <div style={{ flex: '1', minWidth: '220px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>
                🔗 DEPENDS ON PARENT FILTER (OPTIONAL CASCADING)
              </span>
              <Select
                allowClear
                placeholder="None (Root Filter)"
                value={dependsOn || undefined}
                onChange={(val) => {
                  setDependsOn(val || '');
                  if (!val) setParentMatchField('');
                }}
                style={{ width: '100%' }}
                options={[
                  { label: 'None (Root Filter)', value: '' },
                  ...filtersList
                    .filter((_, idx) => editingIndex === null || idx !== editingIndex)
                    .map((f) => ({
                      label: `Parent: ${f.label} (${f.field})`,
                      value: f.filter_key || f.id,
                    })),
                ]}
              />
            </div>

            {dependsOn && (
              <div style={{ flex: '1', minWidth: '220px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>
                  PARENT MATCHING COLUMN IN THIS VIEW
                </span>
                <Select
                  showSearch
                  placeholder="Select matching column in this view"
                  value={parentMatchField || undefined}
                  onChange={setParentMatchField}
                  style={{ width: '100%' }}
                  options={columnSelectOptions}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingTop: '6px' }}>
            {editingIndex !== null && (
              <Button onClick={handleCancelEdit} style={{ borderRadius: 6 }}>
                Cancel
              </Button>
            )}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddOrUpdateFilter}
              style={{
                background: '#15803d',
                borderColor: '#15803d',
                fontWeight: 600,
                height: '36px',
                padding: '0 22px',
                borderRadius: 6,
              }}
            >
              {editingIndex !== null ? 'Update Filter' : 'Add Filter'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Active Configured Filters Table */}
      <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '10px', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>Active Top Filters ({filtersList.length})</span>
        {filtersList.length > 0 && (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            These filters will appear in the top filter bar of this dashboard canvas.
          </Text>
        )}
      </div>

      {filtersList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px', background: '#f8fafc', borderRadius: 8, color: '#94a3b8' }}>
          No dynamic filters configured. Add a filter from the section above.
        </div>
      ) : (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <Table
            dataSource={filtersList.map((f, i) => ({ ...f, key: `${f.id}-${i}`, index: i }))}
            pagination={false}
            size="small"
            columns={[
              {
                title: 'Order',
                width: 90,
                align: 'center',
                render: (_, record, index) => (
                  <Space size={2} style={{ alignItems: 'center' }}>
                    <Button
                      size="small"
                      type="text"
                      icon={<ArrowUpOutlined style={{ fontSize: '11px' }} />}
                      disabled={index === 0}
                      onClick={() => handleMoveUp(index)}
                      title="Move Up (Appear Earlier)"
                    />
                    <Tag color="purple" style={{ margin: 0, fontWeight: 700, borderRadius: 4, minWidth: 22, textAlign: 'center' }}>
                      {index + 1}
                    </Tag>
                    <Button
                      size="small"
                      type="text"
                      icon={<ArrowDownOutlined style={{ fontSize: '11px' }} />}
                      disabled={index === filtersList.length - 1}
                      onClick={() => handleMoveDown(index)}
                      title="Move Down (Appear Later)"
                    />
                  </Space>
                ),
              },
              {
                title: 'Filter Title',
                dataIndex: 'label',
                render: (lbl) => (
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{lbl}</span>
                ),
              },
              {
                title: 'Database View',
                dataIndex: 'table_name',
                render: (tbl) => <Tag color="blue">{tbl}</Tag>,
              },
              {
                title: 'Value Column',
                dataIndex: 'field',
                render: (f) => <Tag color="geekblue">{f}</Tag>,
              },
              {
                title: 'Label Column',
                dataIndex: 'label_field',
                render: (lf, record) => {
                  if (record.filter_type === 'date_range' || record.type === 'date_range') {
                    return <span style={{ color: '#94a3b8', fontSize: '11px' }}>N/A (Range)</span>;
                  }
                  if (record.filter_type === 'date' || record.type === 'date') {
                    return <span style={{ color: '#94a3b8', fontSize: '11px' }}>N/A (Single Date)</span>;
                  }
                  return <Tag color="cyan">{lf || '-'}</Tag>;
                },
              },
              {
                title: 'Cascading Dependency',
                render: (_, record) => {
                  if (!record.depends_on) {
                    return <span style={{ fontSize: '11px', color: '#94a3b8' }}>Root Filter</span>;
                  }
                  const parent = filtersList.find(
                    (f) =>
                      (f.filter_key || f.id) === record.depends_on ||
                      f.id === record.depends_on ||
                      f.filter_key === record.depends_on ||
                      f.field === record.depends_on
                  );
                  return (
                    <Tag color="gold" style={{ fontSize: '11px', fontWeight: 600 }}>
                      🔗 {parent?.label || 'Parent'} ({record.parent_match_field || 'ID'})
                    </Tag>
                  );
                },
              },
              {
                title: 'Filter Type / Mode',
                render: (_, record) => {
                  if (record.filter_type === 'date_range' || record.type === 'date_range') {
                    return <Tag color="magenta" style={{ fontWeight: 600 }}>📅 Date Range (From - To)</Tag>;
                  }
                  if (record.filter_type === 'date' || record.type === 'date') {
                    return <Tag color="cyan" style={{ fontWeight: 600 }}>🗓️ Single Date</Tag>;
                  }
                  return (
                    <Tag color={record.is_multi ? 'green' : 'orange'}>
                      {record.is_multi ? 'Multi-Select' : 'Single Select'}
                    </Tag>
                  );
                },
              },
              {
                title: 'Actions',
                align: 'right',
                render: (_, record, index) => (
                  <Space size="small">
                    <Button
                      size="small"
                      type="link"
                      onClick={() => handleEditFilter(record, index)}
                      style={{ padding: 0 }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      type="link"
                      danger
                      onClick={() => handleRemoveFilter(index)}
                      style={{ padding: 0 }}
                    >
                      Remove
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </div>
      )}
    </Modal>
  );
};

export default ConfigureFiltersModal;
