import React from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import heatmap from 'highcharts/modules/heatmap';
import {
  DollarOutlined,
  RiseOutlined,
  PieChartOutlined,
  TeamOutlined,
  UserOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  BarChartOutlined,
  BankOutlined,
  TrophyOutlined,
  StarOutlined,
  CalendarOutlined,
  FolderOpenOutlined,
  BulbOutlined,
  GlobalOutlined,
  HeartOutlined,
  SafetyCertificateOutlined,
  AuditOutlined,
  SolutionOutlined,
  FlagOutlined,
  NumberOutlined,
} from '@ant-design/icons';

/* ========= SAFE MODULE INIT ========= */
if (typeof heatmap?.default === 'function') {
  heatmap.default(Highcharts);
} else if (typeof heatmap === 'function') {
  heatmap(Highcharts);
}

export const KPI_ICON_MAP = {
  dollar: <DollarOutlined />,
  rise: <RiseOutlined />,
  pie: <PieChartOutlined />,
  team: <TeamOutlined />,
  user: <UserOutlined />,
  environment: <EnvironmentOutlined />,
  bank: <BankOutlined />,
  check: <CheckCircleOutlined />,
  warning: <WarningOutlined />,
  barchart: <BarChartOutlined />,
  trophy: <TrophyOutlined />,
  star: <StarOutlined />,
  calendar: <CalendarOutlined />,
  folder: <FolderOpenOutlined />,
  bulb: <BulbOutlined />,
  global: <GlobalOutlined />,
  heart: <HeartOutlined />,
  safety: <SafetyCertificateOutlined />,
  audit: <AuditOutlined />,
  solution: <SolutionOutlined />,
  flag: <FlagOutlined />,
  number: <NumberOutlined />,
};

export const KPI_COLOR_THEMES = {
  emerald: { label: 'Emerald Green', bg: '#f0fdf4', color: '#15803d' },
  blue: { label: 'Ocean Blue', bg: '#eff6ff', color: '#2563eb' },
  purple: { label: 'Royal Purple', bg: '#faf5ff', color: '#9333ea' },
  amber: { label: 'Amber Orange', bg: '#fffbeb', color: '#d97706' },
  teal: { label: 'Teal Cyan', bg: '#f0fdfa', color: '#0d9488' },
  rose: { label: 'Rose Pink', bg: '#fff1f2', color: '#e11d48' },
  red: { label: 'Crimson Red', bg: '#fef2f2', color: '#dc2626' },
  indigo: { label: 'Indigo Tech', bg: '#eef2ff', color: '#4f46e5' },
  slate: { label: 'Slate Gray', bg: '#f1f5f9', color: '#334155' },
};

export const getKpiTheme = (title = '', customConfig = {}) => {
  let theme = null;

  // 1. Resolve Color Theme
  if (customConfig?.kpi_color_theme && KPI_COLOR_THEMES[customConfig.kpi_color_theme]) {
    theme = { ...KPI_COLOR_THEMES[customConfig.kpi_color_theme] };
  } else {
    // Keyword based default theme
    const t = (title || '').toLowerCase();
    if (t.includes('budget') || t.includes('cost') || t.includes('allocated')) {
      theme = { bg: '#f0fdf4', color: '#16a34a', icon: <DollarOutlined /> };
    } else if (t.includes('spend') || t.includes('utilis') || t.includes('expense')) {
      theme = { bg: '#eff6ff', color: '#2563eb', icon: <RiseOutlined /> };
    } else if (t.includes('%') || t.includes('percent') || t.includes('rate')) {
      theme = { bg: '#faf5ff', color: '#9333ea', icon: <PieChartOutlined /> };
    } else if (t.includes('ongoing') || t.includes('active') || t.includes('project')) {
      theme = { bg: '#fffbeb', color: '#d97706', icon: <TeamOutlined /> };
    } else if (t.includes('beneficiar') || t.includes('people') || t.includes('student') || t.includes('women')) {
      theme = { bg: '#f0fdfa', color: '#0d9488', icon: <UserOutlined /> };
    } else if (t.includes('state') || t.includes('district') || t.includes('village') || t.includes('location')) {
      theme = { bg: '#fff1f2', color: '#e11d48', icon: <EnvironmentOutlined /> };
    } else if (t.includes('risk') || t.includes('delay') || t.includes('alert') || t.includes('pending')) {
      theme = { bg: '#fef2f2', color: '#dc2626', icon: <WarningOutlined /> };
    } else if (t.includes('complet') || t.includes('done') || t.includes('achiev')) {
      theme = { bg: '#f0fdf4', color: '#15803d', icon: <CheckCircleOutlined /> };
    } else {
      theme = { bg: '#f1f5f9', color: '#334155', icon: <BarChartOutlined /> };
    }
  }

  // 2. Resolve Icon
  if (customConfig?.kpi_icon && KPI_ICON_MAP[customConfig.kpi_icon]) {
    theme.icon = KPI_ICON_MAP[customConfig.kpi_icon];
  } else if (!theme.icon) {
    theme.icon = <BarChartOutlined />;
  }

  return theme;
};

const PivotChart = ({ type, data, rows = [], columns = [], values = [], title = '', customConfig = {} }) => {
  if (!data || data.length === 0 || !type || type === 'none') return null;

  // Filter out the 'ZZZZ' (Grand Total) rows from the chart data
  const rowId = rows[0]?.id || Object.keys(data[0])[0];
  const chartData = data.filter((d) => d[rowId] !== 'ZZZZ');

  if (chartData.length === 0) return null;

  // Find the actual key for the value (since it might be aliased like sum_budget)
  const excludedKeys = ['value_json', 'pivoted_values', ...rows.map((r) => r.id), ...columns.map((c) => c.id)];
  const valueKeys = Object.keys(chartData[0]).filter((k) => !excludedKeys.includes(k));
  const actualValueId = valueKeys.length > 0 ? valueKeys[0] : Object.keys(chartData[0])[1] || Object.keys(chartData[0])[0];

  const categories = chartData.map((d) => d[rowId] || 'N/A');
  const seriesData = chartData.map((d) => {
    const val = d[actualValueId];
    if (typeof val === 'string') return parseFloat(String(val).replace(/[₹,]/g, '')) || 0;
    return Number(val) || 0;
  });

  // Detect pivoted breakdown columns (e.g. 'CORPORATE CSR - sum_amount', 'STRATEGIC CSR - sum_amount')
  const breakdownKeys = Object.keys(chartData[0]).filter(
    (k) => !excludedKeys.includes(k) && !k.startsWith('total_')
  );

  let chartSeries = [];
  if (breakdownKeys.length > 1) {
    chartSeries = breakdownKeys.map((key) => {
      const cleanLabel = key
        .replace(/ - (sum|count|distinct_count|distinct_counts|distinctcount|distinct|avg|max|min)_[a-zA-Z0-9_]+$/i, '')
        .replace(/ - (sum|count|distinct_count|distinct_counts|distinctcount|distinct|avg|max|min)$/i, '')
        .replace(/_/g, ' ')
        .toUpperCase();
      return {
        name: cleanLabel,
        data: chartData.map((d) => {
          const val = d[key];
          if (typeof val === 'string') return parseFloat(String(val).replace(/[₹,]/g, '')) || 0;
          return Number(val) || 0;
        }),
      };
    });
  } else {
    chartSeries = [{ name: values[0]?.label || actualValueId.replace(/^total_/, '').replace(/_/g, ' ').toUpperCase(), data: seriesData }];
  }

  // KPI STAT / METRIC CARD RENDERING
  if (type === 'kpi_card' || type === 'card') {
    let sumVal = 0;
    if (breakdownKeys.length > 1) {
      chartSeries.forEach((s) => {
        sumVal += s.data.reduce((acc, curr) => acc + curr, 0);
      });
    } else {
      sumVal = seriesData.reduce((acc, curr) => acc + curr, 0);
    }

    const isCountField = (
      values[0]?.aggregate === 'count' ||
      values[0]?.aggregate === 'distinct_count' ||
      values[0]?.agg === 'count' ||
      values[0]?.agg === 'distinct_count' ||
      values[0]?.aggType?.toLowerCase().includes('count') ||
      actualValueId.startsWith('count_') ||
      actualValueId.startsWith('distinct_count_')
    );
    // Use the aggregated value (sumVal) calculated from the query results (e.g. 200 visits).
    // Only fallback to row count if no measure/value column was configured.
    const displayNum = valueKeys.length > 0 ? sumVal : chartData.length;

    let formattedVal = displayNum >= 10000000
      ? `₹ ${(displayNum / 10000000).toFixed(2)} Cr`
      : displayNum >= 100000
        ? `${(displayNum / 100000).toFixed(2)} Lakh+`
        : displayNum.toLocaleString();

    if (customConfig?.prefix) formattedVal = `${customConfig.prefix} ${formattedVal}`;
    if (customConfig?.suffix) formattedVal = `${formattedVal} ${customConfig.suffix}`;

    const cardTitle = title || values[0]?.label || rows[0]?.label || 'Metric Count';
    const defaultSubtext = isCountField
      ? (chartData.length > 1 ? `${chartData.length} groups analyzed` : 'Total records counted')
      : (chartData.length > 1 ? `${chartData.length} records analyzed` : 'All records analyzed');
    const subtext = customConfig?.subtext || defaultSubtext;
    const theme = getKpiTheme(cardTitle, customConfig);

    return (
      <div
        className="kpi-metric-card-container"
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          height: '100%',
          width: '100%',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
      >
        <div
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: theme.bg,
            color: theme.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            flexShrink: 0,
            boxShadow: `0 2px 6px ${theme.color}22`,
          }}
        >
          {theme.icon}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, overflow: 'hidden' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#64748b',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: '0.2px',
            }}
            title={cardTitle}
          >
            {cardTitle}
          </span>
          <span
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#0f172a',
              lineHeight: 1.25,
              margin: '2px 0 1px 0',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: '-0.5px',
            }}
          >
            {formattedVal}
          </span>
          <span
            style={{
              fontSize: '11px',
              color: '#94a3b8',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {subtext}
          </span>
        </div>
      </div>
    );
  }

  const {
    showDataLabels = false,
    labelRotation = -45,
    stacking = 'none',
    legendPosition = 'top',
    numberFormat = 'compact',
    showGridlines = true,
    orientation = 'vertical',
  } = customConfig || {};

  const isHorizontal = type === 'horizontal_bar' || type === 'bar_horizontal' || orientation === 'horizontal';

  const formatVal = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '0';
    const num = Number(val);
    if (numberFormat === 'raw') return num.toLocaleString();
    if (numberFormat === 'currency_inr') {
      if (num >= 10000000) return `₹ ${(num / 10000000).toFixed(2)} Cr`;
      if (num >= 100000) return `₹ ${(num / 100000).toFixed(2)} L`;
      return `₹ ${num.toLocaleString()}`;
    }
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toLocaleString();
  };

  const baseOptions = {
    title: { text: null },
    credits: { enabled: false },
    chart: {
      borderRadius: 14,
      backgroundColor: '#ffffff',
      style: { fontFamily: 'Inter, sans-serif' },
      spacingBottom: labelRotation === 0 || labelRotation === '0' ? 15 : 40,
      spacingTop: legendPosition === 'top' ? 10 : 15,
      spacingLeft: 10,
      spacingRight: 15,
    },
    xAxis: {
      categories,
      lineColor: '#cbd5e1',
      tickColor: '#cbd5e1',
      labels: {
        enabled: labelRotation !== 'hidden',
        rotation: labelRotation === 'hidden' ? 0 : Number(labelRotation),
        align: Number(labelRotation) === 0 ? 'center' : 'right',
        reserveSpace: true,
        style: {
          color: '#1e293b',
          fontSize: '11px',
          fontWeight: '600',
          textOverflow: 'none',
          whiteSpace: 'nowrap',
        },
      },
    },
    yAxis: {
      gridLineColor: showGridlines ? '#f1f5f9' : 'transparent',
      gridLineWidth: showGridlines ? 1 : 0,
      labels: {
        style: { color: '#64748b', fontSize: '11px' },
        formatter: function () {
          return formatVal(this.value);
        },
      },
      title: { text: null }
    },
    legend: {
      enabled: legendPosition !== 'none' && (chartSeries.length > 1 || type === 'pie' || type === 'doughnut'),
      itemStyle: { color: '#111827', fontWeight: '600', fontSize: '12px' },
      align: legendPosition === 'right' ? 'right' : 'center',
      verticalAlign: legendPosition === 'bottom' ? 'bottom' : (legendPosition === 'right' ? 'middle' : 'top'),
      layout: legendPosition === 'right' ? 'vertical' : 'horizontal',
      margin: 14,
    },
    plotOptions: {
      column: {
        stacking: stacking === 'none' ? undefined : stacking,
        dataLabels: {
          enabled: Boolean(showDataLabels),
          formatter: function () {
            return formatVal(this.y);
          },
          style: {
            fontSize: '10px',
            fontWeight: '600',
            color: '#0f172a',
            textOutline: '2px #ffffff',
          },
        },
      },
      bar: {
        stacking: stacking === 'none' ? undefined : stacking,
        dataLabels: {
          enabled: Boolean(showDataLabels),
          formatter: function () {
            return formatVal(this.y);
          },
          style: { fontSize: '10px', fontWeight: '600', color: '#0f172a', textOutline: '2px #ffffff' },
        },
      },
      line: {
        dataLabels: {
          enabled: Boolean(showDataLabels),
          formatter: function () {
            return formatVal(this.y);
          },
          style: { fontSize: '10px', fontWeight: '600', color: '#0f172a', textOutline: '2px #ffffff' },
        },
      },
      area: {
        stacking: stacking === 'none' ? undefined : stacking,
        dataLabels: {
          enabled: Boolean(showDataLabels),
          formatter: function () {
            return formatVal(this.y);
          },
          style: { fontSize: '10px', fontWeight: '600', color: '#0f172a', textOutline: '2px #ffffff' },
        },
      },
      pie: {
        innerSize: type === 'doughnut' ? '65%' : '0%',
        allowPointSelect: true,
        cursor: 'pointer',
        dataLabels: {
          enabled: Boolean(showDataLabels),
          formatter: function () {
            return `${this.point.name}: ${formatVal(this.y)}`;
          },
          style: { fontSize: '10px', fontWeight: '600' },
        },
        showInLegend: true,
      },
    },
    colors: ['#2563eb', '#16a34a', '#f97316', '#7c3aed', '#db2777', '#0d9488', '#e11d48', '#eab308'],
  };

  let options = { ...baseOptions };

  if (type === 'bar' || type === 'column' || type === 'horizontal_bar' || type === 'bar_horizontal') {
    options = {
      ...options,
      chart: { ...options.chart, type: isHorizontal ? 'bar' : 'column' },
      series: chartSeries,
      tooltip: {
        shared: true,
        useHTML: true,
      },
    };
  } else if (type === 'line' || type === 'spline') {
    options = {
      ...options,
      chart: { ...options.chart, type: 'spline' },
      series: chartSeries,
      tooltip: {
        shared: true,
        useHTML: true,
      },
    };
  } else if (type === 'pie' || type === 'doughnut') {
    options = {
      ...options,
      chart: { ...options.chart, type: 'pie' },
      series: [
        {
          name: values[0]?.label || actualValueId.toUpperCase(),
          colorByPoint: true,
          data: categories.map((cat, i) => ({ name: cat, y: seriesData[i] })),
        },
      ],
    };
  } else if (type === 'area') {
    options = {
      ...options,
      chart: { ...options.chart, type: 'area' },
      series: chartSeries,
      tooltip: {
        shared: true,
        useHTML: true,
      },
    };
  } else if (type === 'heatmap') {
    let yCategories = [];
    let heatmapData = [];

    if (breakdownKeys.length > 1) {
      yCategories = chartSeries.map((s) => s.name);
      chartSeries.forEach((series, yIdx) => {
        series.data.forEach((val, xIdx) => {
          heatmapData.push([xIdx, yIdx, val]);
        });
      });
    } else {
      yCategories = columns.length > 0 && columns[0]?.label
        ? [columns[0].label]
        : [values[0]?.label || actualValueId.replace(/^total_/, '').replace(/_/g, ' ').toUpperCase()];
      seriesData.forEach((val, xIdx) => {
        heatmapData.push([xIdx, 0, val]);
      });
    }

    options = {
      ...options,
      chart: { ...options.chart, type: 'heatmap' },
      xAxis: { ...options.xAxis, categories },
      yAxis: {
        categories: yCategories,
        title: null,
        reversed: true,
        gridLineWidth: showGridlines ? 1 : 0,
        gridLineColor: '#f1f5f9',
        labels: {
          style: { color: '#334155', fontSize: '11px', fontWeight: '600' },
          formatter: function () {
            return this.value;
          },
        },
      },
      colorAxis: {
        min: 0,
        minColor: '#eff6ff',
        maxColor: '#1d4ed8',
        labels: {
          formatter: function () {
            return formatVal(this.value);
          },
          style: { fontSize: '10px', color: '#64748b' },
        },
      },
      legend: {
        enabled: legendPosition !== 'none',
        align: legendPosition === 'bottom' ? 'center' : 'right',
        layout: legendPosition === 'bottom' ? 'horizontal' : 'vertical',
        verticalAlign: legendPosition === 'bottom' ? 'bottom' : 'middle',
        symbolHeight: legendPosition === 'bottom' ? 14 : 200,
      },
      tooltip: {
        formatter: function () {
          const xName = this.series.xAxis.categories ? this.series.xAxis.categories[this.point.x] : this.point.x;
          const yName = this.series.yAxis.categories ? this.series.yAxis.categories[this.point.y] : this.point.y;
          return `<b>${xName}</b><br/>${yName}: <b>${formatVal(this.point.value)}</b>`;
        },
      },
      plotOptions: {
        ...options.plotOptions,
        heatmap: {
          dataLabels: {
            enabled: Boolean(showDataLabels),
            formatter: function () {
              return this.point.value !== null && this.point.value !== undefined ? formatVal(this.point.value) : '';
            },
            style: {
              fontSize: '10px',
              fontWeight: '600',
              color: '#0f172a',
              textOutline: '1px #ffffff',
            },
          },
        },
      },
      series: [
        {
          name: values[0]?.label || actualValueId.toUpperCase(),
          borderWidth: 1,
          borderColor: '#ffffff',
          data: heatmapData,
        },
      ],
    };
  }

  return (
    <div className="md-preview-card" style={{ padding: '8px 12px 12px 12px', background: 'white', height: '100%' }}>
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
};

export default PivotChart;
