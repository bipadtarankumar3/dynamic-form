import React, { useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import {
  Select,
  Button,
  Badge,
  Tag,
  Rate,
  Progress,
  Space,
} from 'antd';
import {
  DollarOutlined,
  RiseOutlined,
  PieChartOutlined,
  TeamOutlined,
  UserOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  RightOutlined,
} from '@ant-design/icons';
import './DefaultCsrOverviewDashboard.css';

const DefaultCsrOverviewDashboard = () => {
  // Top multi-choice filter states
  const [filters, setFilters] = useState({
    state: [],
    district: [],
    theme: [],
    status: [],
    agency: [],
    sdg: [],
    beneficiary: [],
  });

  const handleFilterChange = (key, val) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  };

  // 1. Spend vs Budget Chart (Column)
  const spendVsBudgetOptions = {
    chart: {
      type: 'column',
      height: 220,
      backgroundColor: 'transparent',
      style: { fontFamily: 'Inter, sans-serif' },
    },
    title: { text: null },
    credits: { enabled: false },
    xAxis: {
      categories: ['Approved Budget', 'Amount Released', 'Amount Utilised', 'Balance Amount'],
      labels: { style: { color: '#64748b', fontSize: '10.5px' } },
      lineColor: '#e2e8f0',
    },
    yAxis: {
      title: { text: null },
      gridLineColor: '#f1f5f9',
      labels: { style: { color: '#64748b', fontSize: '10px' } },
    },
    legend: { enabled: false },
    plotOptions: {
      column: {
        borderRadius: 4,
        colorByPoint: true,
        colors: ['#0f172a', '#10b981', '#3b82f6', '#94a3b8'],
        dataLabels: {
          enabled: true,
          style: { fontWeight: '700', color: '#1e293b', fontSize: '10px' },
        },
      },
    },
    series: [
      {
        name: 'Amount (₹ Cr)',
        data: [138.50, 112.30, 96.48, 42.02],
      },
    ],
  };

  // 2. Project Status Overview Chart (Donut)
  const projectStatusOptions = {
    chart: {
      type: 'pie',
      height: 220,
      backgroundColor: 'transparent',
    },
    title: {
      text: '<div style="text-align:center"><span style="font-size:9.5px;color:#94a3b8">Total Projects</span><br/><b style="font-size:18px;color:#0f172a">248</b></div>',
      useHTML: true,
      align: 'center',
      verticalAlign: 'middle',
      x: -50,
      y: -5,
    },
    credits: { enabled: false },
    plotOptions: {
      pie: {
        center: ['30%', '50%'],
        size: '85%',
        innerSize: '68%',
        dataLabels: { enabled: false },
        showInLegend: true,
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'],
      },
    },
    legend: {
      layout: 'vertical',
      align: 'right',
      verticalAlign: 'middle',
      itemStyle: { fontSize: '10.5px', color: '#475569' },
      labelFormatter: function () {
        return `${this.name} <b style="margin-left:6px">${this.y}</b>`;
      },
    },
    series: [
      {
        name: 'Projects',
        data: [
          ['On Track', 110],
          ['Completed', 87],
          ['Delayed', 24],
          ['Yet to Start', 15],
          ['At Risk', 12],
        ],
      },
    ],
  };

  // 3. CSR Spend by Theme Chart (Donut)
  const spendByThemeOptions = {
    chart: {
      type: 'pie',
      height: 220,
      backgroundColor: 'transparent',
    },
    title: { text: null },
    credits: { enabled: false },
    plotOptions: {
      pie: {
        center: ['30%', '50%'],
        size: '85%',
        innerSize: '62%',
        dataLabels: { enabled: false },
        showInLegend: true,
        colors: ['#ec4899', '#06b6d4', '#8b5cf6', '#10b981', '#3b82f6', '#f59e0b'],
      },
    },
    legend: {
      layout: 'vertical',
      align: 'right',
      verticalAlign: 'middle',
      itemStyle: { fontSize: '10.5px', color: '#475569' },
      labelFormatter: function () {
        return `${this.name} <b>${this.y}%</b>`;
      },
    },
    series: [
      {
        name: 'Spend Share',
        data: [
          ['Education', 31.2],
          ['Healthcare', 22.5],
          ['Livelihood', 16.8],
          ['Rural Dev', 12.4],
          ['Environment', 8.3],
          ['Others', 8.8],
        ],
      },
    ],
  };

  // 4. Financial Progress Stacked Bars
  const financialProgressOptions = {
    chart: {
      type: 'bar',
      height: 210,
      backgroundColor: 'transparent',
    },
    title: { text: null },
    credits: { enabled: false },
    xAxis: {
      categories: ['On Track', 'Delayed', 'Yet to Start', 'At Risk'],
      labels: { style: { color: '#64748b', fontSize: '10px' } },
    },
    yAxis: {
      min: 0,
      title: { text: null },
      gridLineColor: '#f1f5f9',
      labels: { style: { color: '#64748b', fontSize: '10px' } },
    },
    legend: {
      align: 'right',
      verticalAlign: 'top',
      itemStyle: { fontSize: '10px', color: '#64748b' },
    },
    plotOptions: {
      series: {
        stacking: 'normal',
        borderRadius: 2,
      },
    },
    colors: ['#10b981', '#3b82f6', '#cbd5e1'],
    series: [
      { name: 'Released', data: [58.45, 21.30, 10.85, 21.70] },
      { name: 'Utilised', data: [49.31, 14.75, 0.00, 18.42] },
      { name: 'Balance', data: [9.14, 6.55, 10.85, 3.28] },
    ],
  };

  // 5. Beneficiary Breakdown Donut
  const beneficiaryOptions = {
    chart: {
      type: 'pie',
      height: 210,
      backgroundColor: 'transparent',
    },
    title: {
      text: '<div style="text-align:center"><b style="font-size:16px;color:#0f172a">15.28</b><br/><span style="font-size:9.5px;color:#94a3b8">Lakh+</span></div>',
      useHTML: true,
      align: 'center',
      verticalAlign: 'middle',
      x: -45,
      y: -5,
    },
    credits: { enabled: false },
    plotOptions: {
      pie: {
        center: ['30%', '50%'],
        size: '85%',
        innerSize: '65%',
        dataLabels: { enabled: false },
        showInLegend: true,
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
      },
    },
    legend: {
      layout: 'vertical',
      align: 'right',
      verticalAlign: 'middle',
      itemStyle: { fontSize: '10.5px', color: '#475569' },
      labelFormatter: function () {
        return `${this.name} <br/><span style="color:#94a3b8;font-size:9.5px">${this.options.detail}</span>`;
      },
    },
    series: [
      {
        name: 'Beneficiaries',
        data: [
          { name: 'Children', y: 42, detail: '6.42 L (42%)' },
          { name: 'Women', y: 35, detail: '5.28 L (35%)' },
          { name: 'Men', y: 17, detail: '2.58 L (17%)' },
          { name: 'Others', y: 6, detail: '1.00 L (6%)' },
        ],
      },
    ],
  };

  // 6. Project Health Score Gauge
  const healthScoreOptions = {
    chart: {
      type: 'pie',
      height: 160,
      backgroundColor: 'transparent',
    },
    title: {
      text: '<div style="text-align:center"><b style="font-size:18px;color:#0f172a">82%</b><br/><span style="font-size:10.5px;color:#10b981;font-weight:700">Good</span></div>',
      useHTML: true,
      align: 'center',
      verticalAlign: 'middle',
      y: -5,
    },
    credits: { enabled: false },
    plotOptions: {
      pie: {
        innerSize: '75%',
        dataLabels: { enabled: false },
        colors: ['#10b981', '#f59e0b', '#f1f5f9'],
      },
    },
    series: [
      {
        name: 'Score',
        data: [
          ['On Track', 82],
          ['Needs Attention', 10],
          ['Remaining', 8],
        ],
      },
    ],
  };

  return (
    <div className="default-csr-dashboard">
      {/* 1. TOP MULTI-CHOICE FILTERS BAR */}
      <div className="dcd-filters-bar">
        <div className="dcd-filters-group">
          <div className="dcd-filter-item">
            <span className="dcd-filter-label">State</span>
            <Select
              mode="multiple"
              maxTagCount={1}
              allowClear
              placeholder="All"
              value={filters.state}
              onChange={(val) => handleFilterChange('state', val)}
              size="middle"
              options={[
                { label: 'Maharashtra', value: 'MH' },
                { label: 'Gujarat', value: 'GJ' },
                { label: 'Andhra Pradesh', value: 'AP' },
                { label: 'Tamil Nadu', value: 'TN' },
                { label: 'Karnataka', value: 'KA' },
                { label: 'Uttar Pradesh', value: 'UP' },
              ]}
            />
          </div>

          <div className="dcd-filter-item">
            <span className="dcd-filter-label">District</span>
            <Select
              mode="multiple"
              maxTagCount={1}
              allowClear
              placeholder="All"
              value={filters.district}
              onChange={(val) => handleFilterChange('district', val)}
              size="middle"
              options={[
                { label: 'Pune', value: 'pune' },
                { label: 'Nagpur', value: 'nagpur' },
                { label: 'Ahmedabad', value: 'ahmedabad' },
                { label: 'Visakhapatnam', value: 'vizag' },
                { label: 'Chennai', value: 'chennai' },
              ]}
            />
          </div>

          <div className="dcd-filter-item">
            <span className="dcd-filter-label">CSR Theme</span>
            <Select
              mode="multiple"
              maxTagCount={1}
              allowClear
              placeholder="All"
              value={filters.theme}
              onChange={(val) => handleFilterChange('theme', val)}
              size="middle"
              options={[
                { label: 'Education', value: 'edu' },
                { label: 'Healthcare', value: 'health' },
                { label: 'Livelihood', value: 'livelihood' },
                { label: 'Rural Development', value: 'rural' },
                { label: 'Environment', value: 'env' },
              ]}
            />
          </div>

          <div className="dcd-filter-item">
            <span className="dcd-filter-label">Project Status</span>
            <Select
              mode="multiple"
              maxTagCount={1}
              allowClear
              placeholder="All"
              value={filters.status}
              onChange={(val) => handleFilterChange('status', val)}
              size="middle"
              options={[
                { label: 'On Track', value: 'on_track' },
                { label: 'Delayed', value: 'delayed' },
                { label: 'Completed', value: 'completed' },
                { label: 'At Risk', value: 'at_risk' },
              ]}
            />
          </div>

          <div className="dcd-filter-item">
            <span className="dcd-filter-label">Implementing Agency</span>
            <Select
              mode="multiple"
              maxTagCount={1}
              allowClear
              placeholder="All"
              value={filters.agency}
              onChange={(val) => handleFilterChange('agency', val)}
              size="middle"
              options={[
                { label: 'ABC Foundation', value: 'abc' },
                { label: 'XYZ Trust', value: 'xyz' },
                { label: 'Seva Bharathi', value: 'seva' },
                { label: 'Education First', value: 'edufirst' },
              ]}
            />
          </div>

          <div className="dcd-filter-item">
            <span className="dcd-filter-label">SDG</span>
            <Select
              mode="multiple"
              maxTagCount={1}
              allowClear
              placeholder="All"
              value={filters.sdg}
              onChange={(val) => handleFilterChange('sdg', val)}
              size="middle"
              options={[
                { label: 'SDG 1 - No Poverty', value: '1' },
                { label: 'SDG 3 - Good Health', value: '3' },
                { label: 'SDG 4 - Quality Education', value: '4' },
                { label: 'SDG 6 - Clean Water', value: '6' },
              ]}
            />
          </div>

          <div className="dcd-filter-item">
            <span className="dcd-filter-label">Beneficiary Category</span>
            <Select
              mode="multiple"
              maxTagCount={1}
              allowClear
              placeholder="All"
              value={filters.beneficiary}
              onChange={(val) => handleFilterChange('beneficiary', val)}
              size="middle"
              options={[
                { label: 'Children', value: 'children' },
                { label: 'Women', value: 'women' },
                { label: 'Men', value: 'men' },
                { label: 'Elderly / PwD', value: 'others' },
              ]}
            />
          </div>
        </div>

        <div className="dcd-last-updated">
          <span>Last Updated: <b>Today, 11:30 AM</b></span>
          <Button type="text" size="small" icon={<ReloadOutlined />} />
        </div>
      </div>

      {/* 2. TOP 8 KPI SUMMARY STAT CARDS */}
      <div className="dcd-kpi-row">
        <div className="dcd-kpi-card">
          <div className="dcd-kpi-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <DollarOutlined />
          </div>
          <div className="dcd-kpi-content">
            <span className="dcd-kpi-title">Total CSR Budget</span>
            <span className="dcd-kpi-value">₹ 138.50 Cr</span>
            <span className="dcd-kpi-sub">Approved Budget</span>
          </div>
        </div>

        <div className="dcd-kpi-card">
          <div className="dcd-kpi-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <RiseOutlined />
          </div>
          <div className="dcd-kpi-content">
            <span className="dcd-kpi-title">Total CSR Spend</span>
            <span className="dcd-kpi-value">₹ 96.48 Cr</span>
            <span className="dcd-kpi-sub">Amount Utilised</span>
          </div>
        </div>

        <div className="dcd-kpi-card">
          <div className="dcd-kpi-icon" style={{ background: '#faf5ff', color: '#9333ea' }}>
            <PieChartOutlined />
          </div>
          <div className="dcd-kpi-content">
            <span className="dcd-kpi-title">Utilisation %</span>
            <span className="dcd-kpi-value">69.61%</span>
            <span className="dcd-kpi-sub">of Approved Budget</span>
          </div>
        </div>

        <div className="dcd-kpi-card">
          <div className="dcd-kpi-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
            <TeamOutlined />
          </div>
          <div className="dcd-kpi-content">
            <span className="dcd-kpi-title">Active Projects</span>
            <span className="dcd-kpi-value">162</span>
            <span className="dcd-kpi-sub">Ongoing Projects</span>
          </div>
        </div>

        <div className="dcd-kpi-card">
          <div className="dcd-kpi-icon" style={{ background: '#f0fdfa', color: '#0d9488' }}>
            <UserOutlined />
          </div>
          <div className="dcd-kpi-content">
            <span className="dcd-kpi-title">Beneficiaries Reached</span>
            <span className="dcd-kpi-value">15.28 Lakh+</span>
            <span className="dcd-kpi-sub">Direct & Indirect</span>
          </div>
        </div>

        <div className="dcd-kpi-card">
          <div className="dcd-kpi-icon" style={{ background: '#fff1f2', color: '#e11d48' }}>
            <EnvironmentOutlined />
          </div>
          <div className="dcd-kpi-content">
            <span className="dcd-kpi-title">States Covered</span>
            <span className="dcd-kpi-value">11</span>
            <span className="dcd-kpi-sub">Across India</span>
          </div>
        </div>

        <div className="dcd-kpi-card">
          <div className="dcd-kpi-icon" style={{ background: '#f0fdf4', color: '#15803d' }}>
            <CheckCircleOutlined />
          </div>
          <div className="dcd-kpi-content">
            <span className="dcd-kpi-title">Projects Completed</span>
            <span className="dcd-kpi-value">87</span>
            <span className="dcd-kpi-sub">Completed Projects</span>
          </div>
        </div>

        <div className="dcd-kpi-card">
          <div className="dcd-kpi-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
            <WarningOutlined />
          </div>
          <div className="dcd-kpi-content">
            <span className="dcd-kpi-title">Projects at Risk</span>
            <span className="dcd-kpi-value" style={{ color: '#dc2626' }}>12</span>
            <span className="dcd-kpi-sub">Require Attention</span>
          </div>
        </div>
      </div>

      {/* 3. ROW 1: Spend vs Budget, Project Status, CSR Spend by Theme, Action Required */}
      <div className="dcd-grid-row dcd-grid-row-1">
        <div className="dcd-card">
          <div className="dcd-card-header">
            <span className="dcd-card-title">Spend vs Budget</span>
            <span className="dcd-card-subtitle">(₹ In Crore)</span>
          </div>
          <HighchartsReact highcharts={Highcharts} options={spendVsBudgetOptions} />
        </div>

        <div className="dcd-card">
          <div className="dcd-card-header">
            <span className="dcd-card-title">Project Status Overview</span>
          </div>
          <HighchartsReact highcharts={Highcharts} options={projectStatusOptions} />
        </div>

        <div className="dcd-card">
          <div className="dcd-card-header">
            <span className="dcd-card-title">CSR Spend by Theme</span>
          </div>
          <HighchartsReact highcharts={Highcharts} options={spendByThemeOptions} />
        </div>

        <div className="dcd-card">
          <div className="dcd-card-header">
            <span className="dcd-card-title" style={{ color: '#b91c1c' }}>Action Required</span>
            <Badge count={6} style={{ backgroundColor: '#ef4444' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div className="dcd-action-item alert">
              <span>Projects with Utilisation &lt; 50%</span>
              <Tag color="error">5</Tag>
            </div>
            <div className="dcd-action-item warning">
              <span>Projects Beyond Planned Date</span>
              <Tag color="warning">3</Tag>
            </div>
            <div className="dcd-action-item">
              <span>Utilisation Certificates Pending</span>
              <Tag color="default">4</Tag>
            </div>
            <div className="dcd-action-item warning">
              <span>Impact Assessment Pending</span>
              <Tag color="warning">2</Tag>
            </div>
            <div className="dcd-action-item">
              <span>Reporting Documents Pending</span>
              <Tag color="default">6</Tag>
            </div>
            <div className="dcd-action-item alert">
              <span>Unutilised Amount in Completed Projects</span>
              <b style={{ color: '#dc2626' }}>₹ 18.75 Cr</b>
            </div>
          </div>
        </div>
      </div>

      {/* 4. ROW 2: Geographic Coverage, Financial Progress, Beneficiary Breakdown, Compliance Status */}
      <div className="dcd-grid-row dcd-grid-row-2">
        <div className="dcd-card">
          <div className="dcd-card-header">
            <span className="dcd-card-title">Geographic Coverage</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
            <div className="dcd-geo-item">
              <span style={{ color: '#64748b' }}>States Covered</span>
              <b style={{ fontSize: '13px' }}>11</b>
            </div>
            <div className="dcd-geo-item">
              <span style={{ color: '#64748b' }}>Districts Covered</span>
              <b style={{ fontSize: '13px' }}>44</b>
            </div>
            <div className="dcd-geo-item">
              <span style={{ color: '#64748b' }}>Blocks Covered</span>
              <b style={{ fontSize: '13px' }}>116</b>
            </div>
            <div className="dcd-geo-item">
              <span style={{ color: '#64748b' }}>Villages Covered</span>
              <b style={{ fontSize: '13px' }}>562</b>
            </div>
            <div className="dcd-geo-item" style={{ paddingTop: '4px' }}>
              <span style={{ color: '#64748b' }}>Community Members Reached</span>
              <b style={{ fontSize: '13px', color: '#0f766e' }}>15.28 Lakh+</b>
            </div>
          </div>
        </div>

        <div className="dcd-card">
          <div className="dcd-card-header">
            <span className="dcd-card-title">Financial Progress</span>
            <span className="dcd-card-subtitle">(₹ In Crore)</span>
          </div>
          <HighchartsReact highcharts={Highcharts} options={financialProgressOptions} />
        </div>

        <div className="dcd-card">
          <div className="dcd-card-header">
            <span className="dcd-card-title">Beneficiary Breakdown</span>
          </div>
          <HighchartsReact highcharts={Highcharts} options={beneficiaryOptions} />
        </div>

        <div className="dcd-card">
          <div className="dcd-card-header">
            <span className="dcd-card-title">Compliance Status</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="dcd-compliance-row">
              <span>CSR Committee Approval</span>
              <Tag color="success" icon={<CheckCircleOutlined />}>Completed</Tag>
            </div>
            <div className="dcd-compliance-row">
              <span>Board Approval</span>
              <Tag color="success" icon={<CheckCircleOutlined />}>Completed</Tag>
            </div>
            <div className="dcd-compliance-row">
              <span>CSR-1 / CSR-2 Filing</span>
              <Tag color="warning" icon={<ClockCircleOutlined />}>In Progress</Tag>
            </div>
            <div className="dcd-compliance-row">
              <span>MoU / Agreement</span>
              <Tag color="success" icon={<CheckCircleOutlined />}>Completed</Tag>
            </div>
            <div className="dcd-compliance-row">
              <span>Utilisation Certificates</span>
              <Tag color="error" icon={<ExclamationCircleOutlined />}>Pending</Tag>
            </div>
            <div className="dcd-compliance-row">
              <span>Annual Report Disclosure</span>
              <Tag color="success" icon={<CheckCircleOutlined />}>Completed</Tag>
            </div>
          </div>
        </div>
      </div>

      {/* 5. ROW 3: SDG Alignment, Partner Performance, Project Health Score */}
      <div className="dcd-grid-row dcd-grid-row-3">
        <div className="dcd-card">
          <div className="dcd-card-header">
            <span className="dcd-card-title">SDG Alignment</span>
            <span className="dcd-card-subtitle">Spend by SDG (₹ Cr)</span>
          </div>
          <div className="dcd-sdg-grid">
            <div className="dcd-sdg-box" style={{ background: '#c5192d' }}>
              <span className="dcd-sdg-num">4</span>
              <span className="dcd-sdg-name">Quality Edu</span>
              <span className="dcd-sdg-amount">₹ 37.42 Cr</span>
            </div>
            <div className="dcd-sdg-box" style={{ background: '#4c9f38' }}>
              <span className="dcd-sdg-num">3</span>
              <span className="dcd-sdg-name">Good Health</span>
              <span className="dcd-sdg-amount">₹ 21.65 Cr</span>
            </div>
            <div className="dcd-sdg-box" style={{ background: '#e5243b' }}>
              <span className="dcd-sdg-num">1</span>
              <span className="dcd-sdg-name">No Poverty</span>
              <span className="dcd-sdg-amount">₹ 15.86 Cr</span>
            </div>
            <div className="dcd-sdg-box" style={{ background: '#26bde2' }}>
              <span className="dcd-sdg-num">6</span>
              <span className="dcd-sdg-name">Clean Water</span>
              <span className="dcd-sdg-amount">₹ 8.56 Cr</span>
            </div>
            <div className="dcd-sdg-box" style={{ background: '#a21942' }}>
              <span className="dcd-sdg-num">8</span>
              <span className="dcd-sdg-name">Decent Work</span>
              <span className="dcd-sdg-amount">₹ 6.72 Cr</span>
            </div>
            <div className="dcd-sdg-box" style={{ background: '#dd1367' }}>
              <span className="dcd-sdg-num">10</span>
              <span className="dcd-sdg-name">Reduced Ineq</span>
              <span className="dcd-sdg-amount">₹ 3.45 Cr</span>
            </div>
            <div className="dcd-sdg-box" style={{ background: '#fd9d24' }}>
              <span className="dcd-sdg-num">11</span>
              <span className="dcd-sdg-name">Cities/Comm</span>
              <span className="dcd-sdg-amount">₹ 1.92 Cr</span>
            </div>
            <div className="dcd-sdg-box" style={{ background: '#3f7e44' }}>
              <span className="dcd-sdg-num">13</span>
              <span className="dcd-sdg-name">Climate Act</span>
              <span className="dcd-sdg-amount">₹ 0.90 Cr</span>
            </div>
          </div>
        </div>

        <div className="dcd-card">
          <div className="dcd-card-header">
            <span className="dcd-card-title">Partner Performance (Top 5)</span>
          </div>
          <table className="dcd-table">
            <thead>
              <tr>
                <th>Partner Name</th>
                <th>Projects</th>
                <th>Amount (₹ Cr)</th>
                <th>Utilisation %</th>
                <th>Performance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>ABC Foundation</b></td>
                <td>18</td>
                <td>12.45</td>
                <td>84%</td>
                <td><Rate disabled defaultValue={5} style={{ fontSize: '11px', color: '#16a34a' }} /></td>
              </tr>
              <tr>
                <td><b>XYZ Trust</b></td>
                <td>15</td>
                <td>9.85</td>
                <td>78%</td>
                <td><Rate disabled defaultValue={4} style={{ fontSize: '11px', color: '#16a34a' }} /></td>
              </tr>
              <tr>
                <td><b>Seva Bharathi</b></td>
                <td>12</td>
                <td>7.60</td>
                <td>74%</td>
                <td><Rate disabled defaultValue={4} style={{ fontSize: '11px', color: '#16a34a' }} /></td>
              </tr>
              <tr>
                <td><b>Education First</b></td>
                <td>10</td>
                <td>6.20</td>
                <td>72%</td>
                <td><Rate disabled defaultValue={3} style={{ fontSize: '11px', color: '#f59e0b' }} /></td>
              </tr>
              <tr>
                <td><b>Rural Uplift Trust</b></td>
                <td>8</td>
                <td>5.30</td>
                <td>68%</td>
                <td><Rate disabled defaultValue={3} style={{ fontSize: '11px', color: '#f59e0b' }} /></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="dcd-card">
          <div className="dcd-card-header">
            <span className="dcd-card-title">Project Health Score</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
            <div style={{ width: '120px', flexShrink: 0 }}>
              <HighchartsReact highcharts={Highcharts} options={healthScoreOptions} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#64748b' }}>
                  <span>Financial Progress</span>
                  <b>78%</b>
                </div>
                <Progress percent={78} size="small" showInfo={false} strokeColor="#10b981" />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#64748b' }}>
                  <span>Physical Progress</span>
                  <b>90%</b>
                </div>
                <Progress percent={90} size="small" showInfo={false} strokeColor="#3b82f6" />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#64748b' }}>
                  <span>Timeline</span>
                  <b>85%</b>
                </div>
                <Progress percent={85} size="small" showInfo={false} strokeColor="#f59e0b" />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#64748b' }}>
                  <span>Documentation</span>
                  <b>95%</b>
                </div>
                <Progress percent={95} size="small" showInfo={false} strokeColor="#10b981" />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#64748b' }}>
                  <span>Outcome Achievement</span>
                  <b>80%</b>
                </div>
                <Progress percent={80} size="small" showInfo={false} strokeColor="#8b5cf6" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DefaultCsrOverviewDashboard;
