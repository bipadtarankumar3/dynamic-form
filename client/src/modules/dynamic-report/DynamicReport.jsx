import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Input, Row, Col, Divider, Table, Space, Typography, Spin } from 'antd';
import { PlusOutlined, MinusOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import { privateHttpClient } from '@/services/api/httpClient'; // Assume this exists and is configured

const { Title, Text } = Typography;
const { Option } = Select;

const OPERATORS = [
  { label: '=', value: '=' },
  { label: '>', value: '>' },
  { label: '<', value: '<' },
  { label: '>=', value: '>=' },
  { label: '<=', value: '<=' },
  { label: '!=', value: '!=' },
];

const DynamicReport = () => {
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [parameters, setParameters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);

  // Form State
  const [adminFilters, setAdminFilters] = useState({});
  const [parameterFilters, setParameterFilters] = useState([{ field: null, operator: '=', value: '', logic: 'AND' }]);
  const [outputFields, setOutputFields] = useState([]);

  useEffect(() => {
    fetchModules();
  }, []);

  // Fetch metadata when module changes
  useEffect(() => {
    if (selectedModule) {
      fetchMetadata(selectedModule);
    } else {
      setParameters([]);
      setOutputFields([]);
      setParameterFilters([{ field: null, operator: '=', value: '', logic: 'AND' }]);
      setReportData([]);
    }
  }, [selectedModule]);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const response = await privateHttpClient.get('dynamic-report/views');
      if (response.data.success) {
        setModules(response.data.data);
      }
    } catch (error) {
      console.error(error);
      toast.error("Error fetching query types");
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async (module) => {
    setLoading(true);
    try {
      const response = await privateHttpClient.get(`dynamic-report/metadata?module=${module}`);
      const result = response.data;
      
      if (result.success) {
        setParameters(result.data.parameters);
        setOutputFields(result.data.parameters.map(p => p.value));
      } else {
        toast.error("Failed to load parameters for module");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error fetching metadata");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!selectedModule) {
      toast.error("Please select a module first");
      return;
    }

    if (!outputFields || outputFields.length === 0 || outputFields.every(f => !f)) {
      toast.error("Please select at least one output field");
      return;
    }

    const payload = {
      module: selectedModule,
      adminFilters,
      parameterFilters: parameterFilters.filter(f => f.field), // filter out empty rows
      outputFields
    };

    setLoading(true);
    try {
      const response = await privateHttpClient.post(`dynamic-report/execute`, payload);
      const result = response.data;

      if (result.success) {
        setReportData(result.data);
      } else {
        toast.error("Failed to generate report");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error executing report");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedModule(null);
    setAdminFilters({});
    setParameterFilters([{ field: null, operator: '=', value: '', logic: 'AND' }]);
    setOutputFields([]);
    setReportData([]);
  };

  const addFilterRow = (index, logic) => {
    const newFilters = [...parameterFilters];
    newFilters.splice(index + 1, 0, { field: null, operator: '=', value: '', logic });
    setParameterFilters(newFilters);
  };

  const removeFilterRow = (index) => {
    if (parameterFilters.length === 1) return;
    const newFilters = parameterFilters.filter((_, i) => i !== index);
    setParameterFilters(newFilters);
  };

  const updateFilterRow = (index, key, value) => {
    const newFilters = [...parameterFilters];
    newFilters[index][key] = value;
    setParameterFilters(newFilters);
  };

  const tableColumns = outputFields.map(fieldValue => {
    const param = parameters.find(p => p.value === fieldValue);
    return {
      title: param ? param.label : fieldValue,
      dataIndex: fieldValue,
      key: fieldValue,
    };
  });

  return (
    <div style={{ padding: '24px' }}>
      <Title level={3}>Dynamic Report</Title>
      
      <Card>
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Text strong>Report Module</Text>
            <Select 
              style={{ width: '100%' }} 
              placeholder="Select Module"
              value={selectedModule}
              onChange={setSelectedModule}
              options={modules}
            />
          </Col>
        </Row>

        <Divider orientation="left">Administrative Filtering</Divider>
        <Row gutter={[16, 16]}>
          {/* Mock Admin Filters */}
          <Col span={6}>
            <Text>State Name</Text>
            <Select style={{ width: '100%' }} placeholder="Select State" disabled>
              <Option value="chhattisgarh">Chhattisgarh</Option>
            </Select>
          </Col>
          <Col span={6}>
            <Text>District Name</Text>
            <Select style={{ width: '100%' }} placeholder="Select District" disabled />
          </Col>
          <Col span={6}>
            <Text>Block Name</Text>
            <Select style={{ width: '100%' }} placeholder="Select Block" disabled />
          </Col>
        </Row>

        <Divider orientation="left">Parameter Filtering</Divider>
        <Spin spinning={loading}>
          {parameterFilters.map((filter, index) => (
            <Row gutter={[16, 16]} key={index} style={{ marginBottom: '10px' }} align="middle">
              {index > 0 && (
                <Col span={2}>
                  <Text strong>{filter.logic}</Text>
                </Col>
              )}
              <Col span={index > 0 ? 6 : 8}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Select Parameter"
                  value={filter.field}
                  onChange={(val) => updateFilterRow(index, 'field', val)}
                  options={parameters}
                  disabled={!selectedModule}
                />
              </Col>
              <Col span={4}>
                <Select
                  style={{ width: '100%' }}
                  value={filter.operator}
                  onChange={(val) => updateFilterRow(index, 'operator', val)}
                  options={OPERATORS}
                />
              </Col>
              <Col span={6}>
                <Input 
                  placeholder="Value" 
                  value={filter.value}
                  onChange={(e) => updateFilterRow(index, 'value', e.target.value)}
                />
              </Col>
              <Col span={6}>
                <Space>
                  <Button type="primary" size="small" onClick={() => addFilterRow(index, 'AND')}>AND</Button>
                  <Button type="primary" size="small" onClick={() => addFilterRow(index, 'OR')}>OR</Button>
                  {parameterFilters.length > 1 && (
                    <Button danger icon={<MinusOutlined />} onClick={() => removeFilterRow(index)} />
                  )}
                </Space>
              </Col>
            </Row>
          ))}
        </Spin>

        <Divider orientation="left">Output Fields</Divider>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Select
              mode="multiple"
              allowClear
              style={{ width: '100%' }}
              placeholder="Please select output fields"
              value={outputFields}
              onChange={setOutputFields}
              options={parameters}
              disabled={!selectedModule}
            />
          </Col>
        </Row>

        <Divider />
        <Row justify="center">
          <Space>
            <Button type="primary" onClick={handleSearch} disabled={!selectedModule || loading}>
              Search
            </Button>
            <Button onClick={handleReset}>
              Reset
            </Button>
          </Space>
        </Row>
      </Card>

      {reportData.length > 0 && (
        <Card style={{ marginTop: '24px' }}>
          <Table 
            dataSource={reportData} 
            columns={tableColumns} 
            rowKey={(record) => record.id || record.key || JSON.stringify(record)}
            pagination={false}
          />
        </Card>
      )}
    </div>
  );
};

export default DynamicReport;
