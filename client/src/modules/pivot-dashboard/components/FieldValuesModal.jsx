import React, { useState, useEffect } from 'react';
import { Modal, Input, Checkbox, Button, Spin } from 'antd';
import { MdSearch } from 'react-icons/md';

const FieldValuesModal = ({ visible, field, onCancel, onApply }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedValues, setSelectedValues] = useState([]);
  const [values, setValues] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && field) {
      fetchValues();
    }
  }, [visible, field]);

  const fetchValues = async () => {
    setLoading(true);
    // Mocking value fetch
    setTimeout(() => {
      const mockValues = [
        { value: 'Value 1', count: 150 },
        { value: 'Value 2', count: 85 },
        { value: 'Value 3', count: 42 },
        { value: 'Value 4', count: 12 },
        { value: 'Value 5', count: 5 },
      ];
      setValues(mockValues);
      setLoading(false);
    }, 500);
  };

  const filteredValues = values.filter(v => 
    v.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleValue = (val) => {
    setSelectedValues(prev => 
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedValues(values.map(v => v.value));
    } else {
      setSelectedValues([]);
    }
  };

  return (
    <Modal
      title={null}
      footer={null}
      open={visible}
      onCancel={onCancel}
      width={400}
      className="pivot-value-modal"
    >
      <div className="value-modal-header">
        <span>{field?.label} Values</span>
      </div>
      
      <div style={{ padding: '20px' }}>
        <Input 
          prefix={<MdSearch />} 
          placeholder="Search values..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ marginBottom: '15px' }}
        />

        <div style={{ marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
          <Checkbox 
            onChange={handleSelectAll}
            checked={selectedValues.length === values.length && values.length > 0}
          >
            Select All
          </Checkbox>
        </div>

        <div className="value-list">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}><Spin /></div>
          ) : (
            filteredValues.map((v, i) => (
              <div key={i} className="value-item">
                <Checkbox 
                  checked={selectedValues.includes(v.value)}
                  onChange={() => toggleValue(v.value)}
                >
                  {v.value}
                </Checkbox>
                <span className="value-count">({v.count})</span>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" onClick={() => onApply(selectedValues)} style={{ background: '#337ab7' }}>
            Apply
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default FieldValuesModal;
