import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import * as HighchartsMore from "highcharts/highcharts-more";
import Exporting from "highcharts/modules/exporting";
import OfflineExporting from "highcharts/modules/offline-exporting";
// ✅ Enable polar module safely
if (typeof HighchartsMore.default === "function") {
  HighchartsMore.default(Highcharts);
} else if (typeof HighchartsMore === "function") {
  HighchartsMore(Highcharts);
}

// ✅ enable exporting menu
if (typeof Exporting === "function") {
  Exporting(Highcharts);
} else if (typeof Exporting?.default === "function") {
  Exporting.default(Highcharts);
}

// ✅ enable download PNG/JPEG locally
if (typeof OfflineExporting === "function") {
  OfflineExporting(Highcharts);
} else if (typeof OfflineExporting?.default === "function") {
  OfflineExporting.default(Highcharts);
}

const ThemeStatusRadialChart = ({ data = [] }) => {

  /* ================= PREPARE DATA ================= */

  const categories = data?.map((t) => t?.tthm_name_of_theme);

  const pendingSeries = data?.map((t) =>
    Number(t?.total_pending_proposal || 0),
  );

  const approvedSeries = data?.map((t) =>
    Number(t?.total_approved_proposal || 0),
  );

  const resendSeries = data?.map((t) => Number(t?.total_resend_proposal || 0));
  const maxCount = Math.max(...data.map((t) => Number(t?.total_proposal || 0)));
  const ticks = Array.from({ length: maxCount + 1 }, (_, i) => i);

  /* ================= CHART OPTIONS ================= */

  const options = {
    chart: {
      polar: true,
      type: "column",
      inverted: true,
      backgroundColor: "transparent",
      height: 520,
    },

    title: {
      text: "Theme Wise Proposal Status",
    },

    pane: {
      size: "95%",
      innerSize: "10%",
      endAngle: 270,
    },

    /* ================= CATEGORY AXIS ================= */
    xAxis: {
      categories,
      tickInterval: 1, // ✅ show all labels
      lineWidth: 0,
      tickLength: 0,
      gridLineWidth: 0,

      labels: {
        step: 1,
        autoRotation: [0],
        style: {
          fontSize: "12px",
        },
      },
    },

    /* ================= VALUE AXIS ================= */
    yAxis: {
      min: 0,
      max: maxCount,
      tickInterval: ticks,
      title: null,
      gridLineWidth: 0,

      labels: {
        enabled: false,
      },
    },

    legend: {
      align: "center",
      verticalAlign: "bottom",
    },

    /* ================= TOOLTIP ================= */
    tooltip: {
      shared: false,
      formatter: function () {
        return `
          <b>${this.point.category}</b><br/>
          <span style="color:${this.series.color}">●</span>
          ${this.series.name}: <b>${this.y}</b>
        `;
      },
    },
    exporting: {
      enabled: true,
      buttons: {
        contextButton: {
          menuItems: ["viewFullscreen", "printChart"],
        },
      },
    },
    /* ================= HOVER EFFECT ================= */
    plotOptions: {
      series: {
        animation: {
          duration: 500,
        },

        point: {
          events: {
            mouseOver: function () {
              const chart = this.series.chart;
              const hoveredSeries = this.series;

              chart.series.forEach((series) => {
                series.points.forEach((point) => {
                  if (!point.graphic) return;

                  if (series !== hoveredSeries) {
                    point.graphic.animate({ opacity: 2 }, { duration: 200 });
                  } else {
                    point.graphic.animate({ opacity: 1 }, { duration: 200 });
                  }
                });
              });
            },

            mouseOut: function () {
              const chart = this.series.chart;

              chart.series.forEach((series) => {
                series.points.forEach((point) => {
                  if (!point.graphic) return;

                  point.graphic.animate({ opacity: 1 }, { duration: 200 });
                });
              });
            },
          },
        },
      },

      column: {
        stacking: "normal",
        borderWidth: 0,
        borderRadius: 20,
        groupPadding: 0.15,
        pointPadding: 0.05,
      },
    },

    /* ================= SERIES ================= */
    series: [
      {
        name: "Pending",
        data: pendingSeries,
        color: "#e66317",
      },
      {
        name: "Approved",
        data: approvedSeries,
        color: "#52991f",
      },
      {
        name: "Resend",
        data: resendSeries,
        color: "#faad14",
      },
    ],

    credits: false,
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
};

export default ThemeStatusRadialChart;
