import React, { useState } from 'react';
import { Button, Space, Typography, Card } from 'antd';
import { 
  SaveOutlined, 
  DownloadOutlined, 
  CloseOutlined, 
  DownOutlined, 
  UpOutlined,
  UnorderedListOutlined
} from '@ant-design/icons';

const { Text } = Typography;

const ActionsPanel = ({ onSave, onExport, onCancel }) => {
  const [advOpen, setAdvOpen] = useState(true);

  const advProps = [
    'Template Name Input',
    'Export Format (Dropdown)',
    'Data Refresh Schedule',
    'Data Refresh (Dropdown)',
    'Data Refresh Schedule (va...',
    'Data Refresh Schedule',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="md-action-btns" style={{ padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Button 
          block 
          size="large" 
          icon={<SaveOutlined />} 
          onClick={onSave}
          style={{ height: '50px', borderRadius: '12px' }}
        >
          Save as Template
        </Button>
        <Button 
          block 
          size="large" 
          type="primary" 
          icon={<DownloadOutlined />} 
          onClick={onExport}
          style={{ height: '50px', borderRadius: '12px', background: '#5d8a1c', borderColor: '#5d8a1c' }}
        >
          Export to Excel
        </Button>
        <Button 
          block 
          size="large" 
          danger 
          icon={<CloseOutlined />} 
          onClick={onCancel}
          style={{ height: '50px', borderRadius: '12px' }}
        >
          Cancel Changes
        </Button>
      </div>

      <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center' }}>
        Apply configured report parameters
      </Text>

      <div
        onClick={() => setAdvOpen(o => !o)}
        style={{ 
          userSelect: 'none', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          cursor: 'pointer',
          marginTop: '10px',
          paddingTop: '20px',
          borderTop: '1px solid #f1f5f9'
        }}
      >
        {advOpen ? <DownOutlined style={{ fontSize: 12 }} /> : <UpOutlined style={{ fontSize: 12 }} />}
        <Text strong>Advanced Properties</Text>
      </div>

      {advOpen && (
        <Space direction="vertical" style={{ width: '100%' }}>
          {advProps.map((prop, i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
              <Text type="secondary" style={{ color: '#16a34a' }}>{prop}</Text>
            </div>
          ))}
        </Space>
      )}
    </div>
  );
};

export default ActionsPanel;
