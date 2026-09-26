import React, { useState, useEffect } from 'react';
import { Button, Input, Table, Typography, Space, Popconfirm } from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  StarOutlined, 
  FolderOutlined, 
  DatabaseOutlined,
  FileProtectOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from '@/hooks/useNextRouter';
import { privateHttpClient } from '@/services/api/httpClient';
import { toast } from 'react-toastify';

const { Title, Text } = Typography;

/**
 * QueriesList Component
 * Displays a list of all saved queries and user favorites.
 * Integrates with the new unified configurator design system.
 */
const QueriesList = () => {
  const navigate = useNavigate();
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'favorites'

  useEffect(() => {
    fetchQueries();
  }, []);

  // Fetch all saved queries from database
  const fetchQueries = async () => {
    setLoading(true);
    try {
      const response = await privateHttpClient.get('dynamic-report/saved');
      if (response.data.success) {
        setQueries(response.data.data);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load saved queries');
    } finally {
      setLoading(false);
    }
  };

  const favoriteQueries = queries.filter(q => q.folder && q.folder.includes('favorites'));
  const uniqueFolders = new Set(queries.map(q => q.folder).filter(Boolean)).size || 1;
  const uniqueAuthors = new Set(queries.map(q => q.author).filter(Boolean)).size || 1;

  const filteredQueries = queries.filter((q) => {
    const matchTab = filterTab === 'all' || (filterTab === 'favorites' && q.folder && q.folder.includes('favorites'));
    const matchSearch = !searchText || (
      (q.title && q.title.toLowerCase().includes(searchText.toLowerCase())) ||
      (q.folder && q.folder.toLowerCase().includes(searchText.toLowerCase())) ||
      (q.author && q.author.toLowerCase().includes(searchText.toLowerCase()))
    );
    return matchTab && matchSearch;
  });

  // Modern column definitions for queries table
  const columns = [
    {
      title: '#',
      key: 'index',
      width: 70,
      align: 'center',
      sorter: (a, b) => (a.id || 0) - (b.id || 0),
      render: (_, __, idx) => (
        <span className="conf-index-badge">
          {idx + 1}
        </span>
      ),
    },
    {
      title: 'Query Title',
      dataIndex: 'title',
      key: 'title',
      sorter: (a, b) => (a.title || "").localeCompare(b.title || ""),
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DatabaseOutlined style={{ color: '#2563eb', fontSize: 14 }} />
          <span 
            style={{ fontWeight: 700, color: '#0f172a', fontSize: '13.5px', cursor: 'pointer' }}
            onClick={() => navigate(`/configurator/reports?view=builder&id=${record.id}`)}
          >
            {text || 'Untitled Query'}
          </span>
        </div>
      ),
    },
    {
      title: 'Folder',
      dataIndex: 'folder',
      key: 'folder',
      sorter: (a, b) => (a.folder || "").localeCompare(b.folder || ""),
      render: (text) => (
        <span className="conf-slug-code" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <FolderOutlined style={{ color: '#94a3b8' }} />
          {text || 'My Queries'}
        </span>
      ),
    },
    {
      title: 'Last Modified',
      key: 'modified',
      sorter: (a, b) => (a.author || "").localeCompare(b.author || ""),
      render: (_, record) => (
        <span style={{ color: '#64748b', fontSize: '13px' }}>
          {record.author || 'System'} • {record.date || 'Recently'}
        </span>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      align: 'center',
      render: () => (
        <span className="conf-badge-published">
          ACTIVE
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/configurator/reports?view=builder&id=${record.id}`)}
            className="conf-action-edit-btn"
          >
            Edit
          </Button>
          <Button
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={() => navigate(`/configurator/reports?view=builder&id=${record.id}`)}
            className="conf-action-outline-btn"
          >
            Run
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="conf-page-container">
      {/* 1. Header */}
      <div className="conf-page-header">
        <div className="conf-page-header-left">
          <div className="conf-page-header-icon">
            <FileProtectOutlined />
          </div>
          <div>
            <h1 className="conf-page-title">Report Builder & Queries</h1>
            <p className="conf-page-subtitle">Create, design, and manage custom database query reports and datasets.</p>
          </div>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/configurator/reports?view=builder')}
          className="conf-create-btn"
        >
          New Query
        </Button>
      </div>

      {/* 2. 4 KPI Stat Cards */}
      <div className="conf-stats-grid">
        <div className="conf-stat-card conf-stat-card--blue">
          <div className="conf-stat-icon-box">
            <DatabaseOutlined />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">Total Queries</span>
            <span className="conf-stat-val">{queries.length}</span>
            <span className="conf-stat-sub">Defined query templates</span>
          </div>
        </div>

        <div className="conf-stat-card conf-stat-card--green">
          <div className="conf-stat-icon-box">
            <StarOutlined />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">Favorites</span>
            <span className="conf-stat-val">{favoriteQueries.length}</span>
            <span className="conf-stat-sub">Starred queries</span>
          </div>
        </div>

        <div className="conf-stat-card conf-stat-card--orange">
          <div className="conf-stat-icon-box">
            <FolderOutlined />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">Query Folders</span>
            <span className="conf-stat-val">{uniqueFolders}</span>
            <span className="conf-stat-sub">Organized categories</span>
          </div>
        </div>

        <div className="conf-stat-card conf-stat-card--purple">
          <div className="conf-stat-icon-box">
            <UserOutlined />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">Authors Active</span>
            <span className="conf-stat-val">{uniqueAuthors}</span>
            <span className="conf-stat-sub">Contributing users</span>
          </div>
        </div>
      </div>

      {/* 3. Controls Filter Bar */}
      <div className="conf-toolbar">
        <div className="conf-toolbar-left">
          {[
            { key: 'all', label: 'All Queries', count: queries.length },
            { key: 'favorites', label: 'Favorites', count: favoriteQueries.length },
          ].map((tab) => (
            <div
              key={tab.key}
              className={`conf-pill-tab ${filterTab === tab.key ? 'active' : ''}`}
              onClick={() => setFilterTab(tab.key)}
            >
              <span>{tab.label}</span>
              <span className="conf-pill-count">{tab.count}</span>
            </div>
          ))}
        </div>

        <div className="conf-toolbar-right">
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Search queries by name or folder..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="conf-search-input"
            allowClear
          />
        </div>
      </div>

      {/* 4. Table */}
      <div className="conf-card-table">
        <Table
          columns={columns}
          dataSource={filteredQueries}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => `Showing ${range[0]} to ${range[1]} of ${total} queries`,
          }}
        />
      </div>
    </div>
  );
};

export default QueriesList;
