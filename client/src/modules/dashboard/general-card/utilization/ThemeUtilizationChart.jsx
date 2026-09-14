import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

/* ========= MODULE IMPORTS ========= */

import Exporting from "highcharts/modules/exporting";
import OfflineExporting from "highcharts/modules/offline-exporting";

/* ========= SAFE MODULE INIT ========= */

// Export menu
if (typeof Exporting?.default === "function") {
  Exporting.default(Highcharts);
} else if (typeof Exporting === "function") {
  Exporting(Highcharts);
}

// Offline export
if (typeof OfflineExporting?.default === "function") {
  OfflineExporting.default(Highcharts);
} else if (typeof OfflineExporting === "function") {
  OfflineExporting(Highcharts);
}

/* ========= INDIAN FORMAT ========= */

const formatINR = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 1,
  }).format(value);

/* ========= COMPONENT ========= */

const ThemeUtilizationChart = ({ data = [] }) => {

  /* ========= PREPARE DATA ========= */

  const themeSeries = data?.map((theme) => ({
    name: theme?.tthm_name_of_theme,
    y: Number(theme?.total_amount || 0), // null safe
  }));

  /* ========= CHART OPTIONS ========= */

  const options = {
    chart: {
      type: "column",
      backgroundColor: "transparent",
    },

    title: {
      text: "Theme Wise Utilization Amount",
    },

    xAxis: {
      type: "category",
      labels: {
        style: {
          color: "#333",
          textDecoration: "none",
        },
      },
    },

    yAxis: {
      title: {
        text: "Total Utilization (₹)",
      },
      labels: {
        formatter: function () {
          return "₹" + formatINR(this.value);
        },
      },
    },

    legend: {
      enabled: false,
    },

    plotOptions: {
      series: {
        borderWidth: 0,
        dataLabels: {
          enabled: true,
          formatter: function () {
            return "₹" + formatINR(this.y);
          },
        },
      },
    },

    tooltip: {
      formatter: function () {
        return `
          <b>${this.point.name}</b><br/>
          Utilized: ₹${formatINR(this.y)}
        `;
      },
    },

    series: [
      {
        name: "Utilization",
        colorByPoint: true,
        data: themeSeries,
      },
    ],

    exporting: {
      enabled: true,
      buttons: {
        contextButton: {
          menuItems: ["viewFullscreen", "printChart"],
        },
      },
    },

    credits: {
      enabled: false,
    },
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
};

export default ThemeUtilizationChart;
