'use client';

import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle, memo } from 'react';
import { Table, Card, Tag, Input, Spin, Empty, Button, Tooltip, Alert } from 'antd';
import { SearchOutlined, ReloadOutlined, TableOutlined, LinkOutlined } from '@ant-design/icons';
import { dynamicMasterDetailsAPI } from '@/services/dynamicForm-service';

/**
 * LinkedTableSectionV2
 * Renders a dynamic cross-form live table linked to another MongoDB collection/master form.
 * Automatically queries and filters target records based on the selected value of a form field.
 */
const LinkedTableSectionV2 = forwardRef(({
  section,
  allData = {},
  mode = 'add',
  form_slug,
  onChange,
}, ref) => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const masterSource = section?.master_source || section?.target_form || section?.slug || 'project';
  const filterByField = section?.filter_by_field;
  const linkKey = section?.link_key || filterByField || 'id';

  // Read the current controlling value from the parent form
  const rawValue = filterByField ? (allData?.[filterByField] ?? allData?.data?.[filterByField]) : null;
  const controllingValue = (typeof rawValue === 'object' && rawValue !== null)
    ? (rawValue.value ?? rawValue.id ?? rawValue._id ?? rawValue)
    : rawValue;

  useImperativeHandle(ref, () => ({
    getData: async () => ({
      valid: true,
      data: selectedRowKeys.length > 0 ? selectedRowKeys : records,
      errors: {},
    }),
    reset: () => {
      setSelectedRowKeys([]);
      setSearchText('');
    },
  }));

  const fetchLinkedRecords = async () => {
    if (filterByField && (controllingValue === undefined || controllingValue === null || controllingValue === '')) {
      setRecords([]);
      return;
    }

    setLoading(true);
    try {
      const filters = {};
      if (filterByField && controllingValue) {
        filters[linkKey] = controllingValue;
      }

      const res = await dynamicMasterDetailsAPI({
        master: masterSource,
        filters,
      });

      const list = res?.data?.data || res?.data?.rows || (Array.isArray(res?.data) ? res.data : []);
      setRecords(list);
    } catch (err) {
      console.error('Failed to fetch linked table records:', err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinkedRecords();
  }, [masterSource, controllingValue]);

  // Dynamically compute table columns from display_fields, section.fields, or loaded MongoDB documents
  const columns = useMemo(() => {
    // 1. If explicit display_fields are selected by the admin/client
    if (section?.display_fields && Array.isArray(section.display_fields) && section.display_fields.length > 0) {
      return section.display_fields.map((fieldKey) => {
        const matchingFld = (section.fields || []).find((f) => (f.db_field || f.name || f.column_name) === fieldKey);
        const title = matchingFld?.label || matchingFld?.name || fieldKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

        return {
          title,
          dataIndex: fieldKey,
          key: fieldKey,
          ellipsis: true,
          render: (text, record) => {
            const val = text !== undefined ? text : record?.[fieldKey] !== undefined ? record[fieldKey] : record?.data?.[fieldKey];
            if (val === null || val === undefined || val === '') return <span style={{ color: '#cbd5e1' }}>—</span>;
            if (typeof val === 'boolean') return <Tag color={val ? 'green' : 'red'}>{val ? 'Yes' : 'No'}</Tag>;
            if (typeof val === 'number') {
              if (fieldKey.toLowerCase().includes('budget') || fieldKey.toLowerCase().includes('amount') || fieldKey.toLowerCase().includes('cost')) {
                return <span style={{ fontWeight: 600, color: '#0f172a' }}>₹{val.toLocaleString('en-IN')}</span>;
              }
              return <span style={{ fontWeight: 600, color: '#0f172a' }}>{val.toLocaleString('en-IN')}</span>;
            }
            if (typeof val === 'string' && /status/i.test(fieldKey)) {
              const s = val.toLowerCase();
              const color = s.includes('active') || s.includes('approved') || s.includes('completed') ? 'green' : s.includes('pending') ? 'orange' : s.includes('reject') ? 'red' : 'blue';
              return <Tag color={color} style={{ borderRadius: 6, fontWeight: 700 }}>{val}</Tag>;
            }
            if (typeof val === 'object') return <span>{JSON.stringify(val)}</span>;
            return <span>{String(val)}</span>;
          },
        };
      });
    }

    // 2. If section.fields is defined
    if (section?.fields && section.fields.length > 0) {
      return section.fields.map((fld) => ({
        title: fld.label || fld.name || fld.db_field,
        dataIndex: fld.db_field || fld.name || fld.column_name,
        key: fld.db_field || fld.name || fld.column_name,
        ellipsis: true,
        render: (text) => {
          if (text === null || text === undefined) return <span style={{ color: '#cbd5e1' }}>—</span>;
          if (typeof text === 'boolean') return <Tag color={text ? 'green' : 'red'}>{text ? 'Yes' : 'No'}</Tag>;
          if (typeof text === 'object') return <span>{JSON.stringify(text)}</span>;
          return <span>{String(text)}</span>;
        },
      }));
    }

    // 3. Fallback: derive from first record's properties
    if (records.length > 0) {
      const sample = records[0];
      const excluded = new Set(['_id', '__v', 'deleted_at', 'created_by', 'updated_by', 'tenant_id']);
      const keys = Object.keys(sample).filter((k) => !excluded.has(k) && typeof sample[k] !== 'function');

      return keys.slice(0, 8).map((k) => ({
        title: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        dataIndex: k,
        key: k,
        ellipsis: true,
        render: (text) => {
          if (text === null || text === undefined) return <span style={{ color: '#cbd5e1' }}>—</span>;
          if (typeof text === 'boolean') return <Tag color={text ? 'green' : 'red'}>{text ? 'Yes' : 'No'}</Tag>;
          if (typeof text === 'object') return <span>{JSON.stringify(text)}</span>;
          return <span>{String(text)}</span>;
        },
      }));
    }

    return [
      { title: 'ID', dataIndex: 'id', key: 'id' },
      { title: 'Name', dataIndex: 'name', key: 'name' },
      { title: 'Details', dataIndex: 'details', key: 'details' },
    ];
  }, [section?.display_fields, section?.fields, records]);

  // Filtered rows for client search
  const filteredData = useMemo(() => {
    if (!searchText) return records;
    const term = searchText.toLowerCase();
    return records.filter((r) =>
      Object.values(r).some((val) => String(val || '').toLowerCase().includes(term))
    );
  }, [records, searchText]);

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TableOutlined style={{ color: '#16a34a', fontSize: 16 }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
              {section?.section_label || 'Dynamic Linked Records'}
            </span>
            <Tag color="geekblue" style={{ borderRadius: 6, fontWeight: 600, fontSize: 11, margin: 0, padding: '2px 8px' }}>
              <LinkOutlined style={{ marginRight: 4 }} /> {masterSource}
            </Tag>
            {filterByField && controllingValue && (
              <Tag color="green" style={{ borderRadius: 6, fontSize: 11 }}>
                Filtered by {filterByField}: {String(controllingValue)}
              </Tag>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Input
              size="small"
              placeholder="Search records..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 180, borderRadius: 6 }}
              allowClear
            />
            <Tooltip title="Refresh linked data">
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={fetchLinkedRecords}
                loading={loading}
                style={{ borderRadius: 6 }}
              />
            </Tooltip>
          </div>
        </div>
      }
      style={{
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        marginBottom: 20,
        overflow: 'hidden',
        background: '#ffffff',
      }}
      styles={{
        header: {
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '12px 18px',
          minHeight: 'auto',
        },
        body: {
          padding: '16px',
        },
      }}
    >
      {filterByField && !controllingValue ? (
        <Alert
          message={`Please select a "${filterByField}" above to view related ${masterSource} records.`}
          type="info"
          showIcon
          style={{ borderRadius: 8 }}
        />
      ) : (
        <Spin spinning={loading}>
          <Table
            size="small"
            dataSource={filteredData}
            columns={columns}
            rowKey={(r) => r.id || r._id || JSON.stringify(r)}
            pagination={{ pageSize: 5, showSizeChanger: false }}
            locale={{
              emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`No matching records found in ${masterSource}`} />
            }}
            scroll={{ x: 'max-content' }}
          />
        </Spin>
      )}
    </Card>
  );
});

export default memo(LinkedTableSectionV2);
