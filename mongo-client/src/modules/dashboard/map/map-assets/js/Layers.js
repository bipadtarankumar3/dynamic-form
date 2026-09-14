import { GeoJSON } from "ol/format";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { Fill, Icon, Stroke, Style, Text } from "ol/style";
import authUtils from "@/utils/authUtils";
import greenIcon from "../img/green.png";
import blueIcon from "../img/blue.png";
import pinkIcon from "../img/pink.png";
import redIcon from "../img/red.png";
import violetIcon from "../img/violet.png";
import yellowIcon from "../img/yellow.png";
import apiUrlMap from "../../../monitoringApiUrlMap";
const MAP_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const createGeoJsonLayer = (name, url, styleFunction) =>
  new VectorLayer({
    name,
    source: new VectorSource({
      format: new GeoJSON({
        defaultDataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      }),
      loader: async function (extent, resolution, projection) {
        try {
          const response = await fetch(url, {
            headers: {
              Authorization: `Bearer ${authUtils.getToken()}`,
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            console.warn(`[${name}] Failed to load GeoJSON from ${url} (status: ${response.status})`);
            return;
          }

          const data = await response.json();
          if (!data) return;
          const features = new GeoJSON().readFeatures(data, {
            dataProjection: "EPSG:4326",
            featureProjection: projection,
          });

          this.addFeatures(features);
        } catch (err) {
          console.error(`[${name}] layer load error:`, err);
        }
      },
    }),
    style: styleFunction || undefined,
    visible: true,
  });

export const MonitoringPointsLayer = ({ type, from_date, to_date } = {}) => {
  return new VectorLayer({
    name: "filtared_points",
    source: new VectorSource({
      format: new GeoJSON({
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      }),
      loader: async function (extent, resolution, projection) {
        if (!type) return;
        try {
          const response = await fetch(
            `${MAP_BASE_URL}/dash/${apiUrlMap[type]}`,
            {
              method: "POST",
              body: JSON.stringify({
                from_date,
                to_date,
              }),
              headers: {
                Authorization: `Bearer ${authUtils.getToken()}`,
                "Content-Type": "application/json",
              },
            },
          );

          if (!response.ok) {
            console.warn(`[pointsLayer] Failed to load GeoJSON for type ${type} (status: ${response.status})`);
            return;
          }

          const data = await response.json();
          const updatedData =
            data?.features?.length > 0
              ? data?.features?.map((item) => ({
                  ...item,
                  properties: {
                    ...item.properties,
                    apiCoordinate: item.geometry?.coordinates,
                  },
                }))
              : [];

          const features = new GeoJSON().readFeatures(
            { type: "FeatureCollection", features: updatedData },
            {
              dataProjection: "EPSG:4326",
              featureProjection: projection,
            },
          );

          this.clear();
          this.addFeatures(features);
        } catch (err) {
          console.error(`[pointsLayer] load error:`, err);
        }
      },
    }),
    style: function (feature) {
      let pointImage = greenIcon;
      const entity_color = feature.get("entity_color");
      if (entity_color === "green") pointImage = greenIcon;
      else if (entity_color === "blue") pointImage = blueIcon;
      else if (entity_color === "pink") pointImage = pinkIcon;
      else if (entity_color === "red") pointImage = redIcon;
      else if (entity_color === "violet") pointImage = violetIcon;
      else if (entity_color === "yellow") pointImage = yellowIcon;

      return new Style({
        image: new Icon({
          src: pointImage,
          scale: 0.07,
          anchor: [0.5, 1],
        }),
        text: new Text({
          fill: new Fill({ color: "white" }),
          stroke: new Stroke({ color: "black", width: 2 }),
          font: "14px Arial",
          text: feature.get("twhp_gis_id") || "",
          offsetY: 17,
        }),
      });
    },
    visible: true,
  });
};

export const stateLayer = createGeoJsonLayer(
  "state",
  `${MAP_BASE_URL}/map/state-layer`,
  (feature) =>
    new Style({
      fill: new Fill({ color: feature.get("color") }),
      stroke: new Stroke({ color: "#FF8C00", width: 1 }),
      text: new Text({
        fill: new Fill({ color: "white" }),
        stroke: new Stroke({ color: "black", width: 2 }),
        font: "Normal 14px Arial",
        text: feature.get("name"),
      }),
    }),
);
