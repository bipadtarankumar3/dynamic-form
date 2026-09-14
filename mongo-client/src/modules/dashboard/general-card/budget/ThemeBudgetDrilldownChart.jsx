import Highcharts, { color } from "highcharts";
import HighchartsReact from "highcharts-react-official";

/* ========= MODULE IMPORTS ========= */

import * as HighchartsMore from "highcharts/highcharts-more";
import Drilldown from "highcharts/modules/drilldown";
import Exporting from "highcharts/modules/exporting";
import OfflineExporting from "highcharts/modules/offline-exporting";

/* ========= SAFE MODULE INIT ========= */

// Polar / extra charts
if (typeof HighchartsMore?.default === "function") {
  HighchartsMore.default(Highcharts);
} else if (typeof HighchartsMore === "function") {
  HighchartsMore(Highcharts);
}

// Drilldown
if (typeof Drilldown?.default === "function") {
  Drilldown.default(Highcharts);
} else if (typeof Drilldown === "function") {
  Drilldown(Highcharts);
}

// Export menu
if (typeof Exporting?.default === "function") {
  Exporting.default(Highcharts);
} else if (typeof Exporting === "function") {
  Exporting(Highcharts);
}

// Offline exporting
if (typeof OfflineExporting?.default === "function") {
  OfflineExporting.default(Highcharts);
} else if (typeof OfflineExporting === "function") {
  OfflineExporting(Highcharts);
}

/* ========= INDIAN FORMAT ========= */

const formatINR = (value) => new Intl.NumberFormat("en-IN").format(value);

/* ========= COMPONENT ========= */

const ThemeBudgetDrilldownChart = ({ data = [] }) => {
//   if (!data?.length) return null;

  const themeSeries = [];
  const drilldownSeries = [];

  /* ========= BUILD DRILLDOWN STRUCTURE ========= */

  data?.forEach((theme) => {
    const themeTotal = theme?.activities.reduce(
      (sum, act) => sum + Number(act?.total_budget || 0),
      0,
    );

    themeSeries.push({
      name: theme?.theme_name,
      y: themeTotal,
      drilldown: theme?.theme_id,
      color: theme?.theme_color || "#7cb5ec",
    });

    const activityPoints = [];

    theme?.activities?.forEach((activity) => {
      activityPoints.push({
        name: activity?.activity_name,
        y: Number(activity?.total_budget || 0),
        drilldown: activity?.activity_id,
      });

      // FY Level
      drilldownSeries.push({
        id: activity?.activity_id,
        name: activity?.activity_name,
        data: activity?.fy_breakdown?.map((fy) => [
          fy?.fy_name,
          Number(fy?.budget || 0),
        ]),
      });
    });

    // Activity Level
    drilldownSeries.push({
      id: theme?.theme_id,
      name: theme?.theme_name,
      data: activityPoints,
    });
  });

  /* ========= CHART OPTIONS ========= */

  const options = {
    chart: {
      type: "column",
      backgroundColor: "transparent",
    },

    title: {
      text: "Theme Wise Budget Overview",
    },

    subtitle: {
      text: "Click columns to drill down",
    },

    xAxis: {
      type: "category",
      labels: {
        style: {
          textDecoration: "none",
          color: "#333",
          fontWeight: "normal",
        },
      },
    },

    yAxis: {
      title: {
        text: "Total Budget (₹)",
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
        cursor: "pointer",
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
          Budget: ₹${formatINR(this.y)}
        `;
      },
    },

    series: [
      {
        name: "Themes",
        colorByPoint: true,
        data: themeSeries,
      },
    ],

    drilldown: {
      breadcrumbs: {
        position: {
          align: "right",
        },
      },

      activeAxisLabelStyle: {
        textDecoration: "none",
        color: "#333",
        fontWeight: "normal",
      },

      activeDataLabelStyle: {
        textDecoration: "none",
        color: "#000",
        fontWeight: "normal",
      },

      series: drilldownSeries,
    },

    exporting: {
      enabled: true,
      buttons: {
        contextButton: {
          menuItems: ["viewFullscreen", "printChart"],
        },
      },
    },

    credits: {
      enabled: false, // remove Highcharts.com
    },
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
};

export default ThemeBudgetDrilldownChart;
