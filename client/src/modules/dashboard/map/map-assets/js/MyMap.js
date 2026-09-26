import Map from "ol/Map";
import Overlay from "ol/Overlay";
import View from "ol/View";
import { defaults, FullScreen, MousePosition } from "ol/control";
import { createStringXY } from "ol/coordinate";
import { LineString, Point, Polygon } from "ol/geom";
import { Draw, Modify } from "ol/interaction";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { fromLonLat } from "ol/proj";
import { Vector as VectorSource, XYZ } from "ol/source";
import { Circle, Fill, RegularShape, Stroke, Style, Text } from "ol/style";

import $ from "jquery";
import { stateLayer, MonitoringPointsLayer } from "./Layers";

// Element references
const container = document.getElementById("popup") || createPopupContainer();

function createPopupContainer() {
  const div = document.createElement("div");
  div.id = "popup";
  document.body.appendChild(div);
  return div;
}

// Layers
export var bingLayer = new TileLayer({
  title: "Esri Satellite",
  source: new XYZ({
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attributions: "Tiles © Esri",
    maxZoom: 18,
  }),
  visible: true,
});

const plotTooltip = new Overlay({
  element: container,
  autoPan: true,
  autoPanAnimation: { duration: 250 },
});

const fullscreenControl = new FullScreen();
const mousePositionControl = new MousePosition({
  coordinateFormat: createStringXY(6),
  projection: "EPSG:4326",
  className: "custom-mouse-position",
  target: document.getElementById("mouse-position"),
  undefinedHTML: "&nbsp;",
});

export const plotselect = new VectorLayer({
  name: "plotselect",
  style: new Style({
    fill: new Fill({ color: "transparent" }),
    stroke: new Stroke({ color: "blue", width: 3 }),
  }),
  visible: true,
});

let measuredValue = "";
let strokeSl = 1;

const source = new VectorSource();

const modify = new Modify({
  source: source,
  style: new Style({
    image: new Circle({ radius: 5, stroke: new Stroke({ color: "green" }) }),
  }),
});

// Initial map
export function init({ type = "", from_date, to_date }) {
  const newLocation = fromLonLat([78.8718, 21.7679]);
  const map = new Map({
    controls: defaults({
      attributionOptions: {
        collapsible: false,
      },
    }).extend([mousePositionControl, fullscreenControl]),
    overlays: [plotTooltip],
    layers: [bingLayer, stateLayer, MonitoringPointsLayer({ type, from_date, to_date })],
    target: "map",
    view: new View({
      center: newLocation,
      zoom: 4.3,
      minZoom: 4.3,
      maxZoom: 19,
    }),
  });

  const popup = new Overlay({ element: container });
  map.addOverlay(popup);
  map.addOverlay(plotTooltip);

  $("#popup-closer").on("click", () => {
    plotTooltip.setPosition(undefined);
    $("#popup-closer").blur();
    $("#popup").hide();
    return false;
  });

  let draw;
  let drawType = "LineString";
  let tipPoint;

  const segmentStyle = new Style({
    text: new Text({
      font: "12px Calibri,sans-serif",
      fill: new Fill({ color: "white" }),
      backgroundFill: new Fill({ color: "rgba(0, 0, 0, 0.4)" }),
      padding: [2, 2, 2, 2],
      offsetY: -12,
    }),
    image: new RegularShape({
      radius: 6,
      points: 3,
      angle: Math.PI,
      displacement: [0, 8],
      fill: new Fill({ color: "rgba(0, 0, 0, 0.4)" }),
    }),
  });

  const vector = new VectorLayer({
    source: source,
    style: (feature) => styleFunction(feature, drawType, tipPoint),
  });

  map.addLayer(vector);
  map.addInteraction(modify);

  $(".measure_area_length").on("click", function () {
    const type = $(this).attr("data-name");
    addInteraction(map, type);
  });

  function addInteraction(map, type) {
    drawType = type;
    if (draw) map.removeInteraction(draw);

    draw = new Draw({ source, type: drawType });
    map.addInteraction(draw);

    draw.on("drawstart", () => source.clear());
    draw.on("drawend", () => {
      if (measuredValue) {
        $("#measured_value").append(
          `<tr><td>${strokeSl}</td><td>${measuredValue}</td></tr>`,
        );
        strokeSl++;
      }
    });
  }

  function styleFunction(feature, drawType, tipPoint) {
    const styles = [
      new Style({ stroke: new Stroke({ color: "green", width: 2 }) }),
    ];
    const geometry = feature.getGeometry();
    let label;
    let point;

    if (geometry instanceof LineString && drawType === "LineString") {
      label = formatLength(geometry);
      point = new Point(geometry.getLastCoordinate());
    } else if (geometry instanceof Polygon && drawType === "Polygon") {
      label = formatArea(geometry);
      point = geometry.getInteriorPoint();
    }

    if (label && point) {
      measuredValue = label;
      styles.push(
        new Style({
          text: new Text({
            text: label,
            font: "14px Calibri,sans-serif",
            fill: new Fill({ color: "#fff" }),
            backgroundFill: new Fill({ color: "rgba(0,0,0,0.7)" }),
            padding: [2, 2, 2, 2],
          }),
          geometry: point,
        }),
      );
    }

    return styles;
  }

  function formatLength(line) {
    const length = line.getLength();
    return length > 1000
      ? `${(length / 1000).toFixed(2)} km`
      : `${length.toFixed(2)} m`;
  }

  function formatArea(polygon) {
    const area = polygon.getArea();
    return area > 10000
      ? `${(area / 1000000).toFixed(2)} km²`
      : `${area.toFixed(2)} m²`;
  }

  $("#clearMeasure").on("click", () => {
    if (draw) map.removeInteraction(draw);
    source.clear();
    $("#measured_value").empty();
    strokeSl = 1;
  });

  return map;
}
