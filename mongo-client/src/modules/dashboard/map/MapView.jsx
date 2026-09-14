import { privateHttpClient } from "@/api/httpClient";
import { Overlay } from "ol";
import "ol/ol.css";
import { transform } from "ol/proj";
import { BingMaps } from "ol/source";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./map-assets/css/map.css";
import "./map-assets/css/popup.css";
import { MonitoringPointsLayer } from "./map-assets/js/Layers";
import { bingLayer, init } from "./map-assets/js/MyMap";
import moment from "moment";
// import { setInitialStateValue } from "@/store/slices/monitoringGeojsonSlice";
// import { formatNumberWithCommas } from "../../../../utils/formatNumberWithCommas";
export default function MapView() {
  const { monitoringGeojson, type } = useSelector(
    (state) => state.monitoringGeojsonSlice,
  );
  const filterValues = useSelector((state) => state.dashboardFilterSlice);

  const dispatch = useDispatch();
  const [baseMapState, setBaseMap] = useState(false);
  const [filterState, setFilterState] = useState(false);
  const [myMap, setMap] = useState(null);

  const [popupDetails, setPopupDetails] = useState({});
  const popupRef = useRef(null);
  const popupElRef = useRef(null);
  const mapClickRef = useRef(null);

  const handleClosePopup = () => {
    popupRef.current?.setPosition(undefined);
    if (popupElRef.current) popupElRef.current.style.display = "none";
  };

  useEffect(() => {
    handleClosePopup();
    const mapInstance = init({
      type,
      ...filterValues,
    });
    setMap(mapInstance);

    popupRef.current = new Overlay({
      element: popupElRef.current,
      autoPan: {
        animation: {
          duration: 250,
        },
        margin: 50,
      },
    });
    mapInstance.addOverlay(popupRef.current);
    MonitoringPointsLayer().getSource().clear();
    MonitoringPointsLayer().getSource().refresh();
    mapClickRef.current = mapInstance.on("singleclick", (event) => {
      handleMapClick(event, mapInstance);
    });

    return () => {
      mapInstance.setTarget(null);
      if (mapClickRef.current) {
        mapInstance.un("singleclick", mapClickRef.current);
      }
    };
  }, [type, filterValues]);

  const handleMapClick = (event, map) => {
    let foundFeature = null;

    map.forEachFeatureAtPixel(event.pixel, (feature) => {
      foundFeature = feature;
      return true;
    });

    const apiCoordinate = foundFeature?.get("apiCoordinate");
    if (apiCoordinate) {
      const webMercator = transform(apiCoordinate, "EPSG:4326", "EPSG:3857");

      setPopupDetails({
        project_id: foundFeature.get("project_id"),
        project_title: foundFeature.get("project_title"),
        created_by_name: foundFeature.get("created_by_name"),
        created_at: foundFeature.get("created_at"),
        state: foundFeature.get("state_name"),
        district: foundFeature.get("district_name"),
      });
      map.getView().animate({ center: webMercator, duration: 900, zoom: 6 });

      if (popupElRef.current) {
        popupElRef.current.style.display = "block";
        popupElRef.current.style.opacity = "1";
        popupRef.current.setPosition(webMercator);
      }

      // dispatch(
      //   setInitialStateValue({
      //     key: "project_id",
      //     value: foundFeature.get("tpro_id"),
      //   })
      // );

      // const requestData = {
      //   coordinate: apiCoordinate,
      //   ogc_fid: foundFeature.get("ogc_fid"),
      //   tpro_id: foundFeature.get("tpro_id"),
      // };

      // privateHttpClient
      //   .post("dsh/group-head/project-details-on-map", requestData)
      //   .then((response) => {
      //     setPopupDetails({
      //       ...response?.data?.data,
      //       state: foundFeature.get("state_name"),
      //       district: foundFeature.get("district_name"),
      //     });

      //     map
      //       .getView()
      //       .animate({ center: webMercator, duration: 900, zoom: 6 });

      //     if (popupElRef.current) {
      //       popupElRef.current.style.display = "block";
      //       popupElRef.current.style.opacity = "1";
      //       popupRef.current.setPosition(webMercator);
      //     }
      //   })
      //   .catch((err) => {
      //     handleClosePopup();
      //   });
    } else {
      handleClosePopup();
      // dispatch(setInitialStateValue({ key: "project_id", value: "" }));
    }
  };

  useEffect(() => {
    if (Object.keys(monitoringGeojson || {}).length > 0) {
      const actCoordinate =
        monitoringGeojson?.features?.[0]?.geometry?.coordinates;
      const locationData = monitoringGeojson?.features?.[0]?.properties;
      const webMercator = transform(actCoordinate, "EPSG:4326", "EPSG:3857");

      setPopupDetails({
        project_id: locationData?.project_id,
        project_title: locationData?.project_title,
        created_by_name: locationData?.created_by_name,
        created_at: locationData?.created_at,
      });
      myMap?.getView()?.animate({
        center: webMercator,
        duration: 900,
        zoom: 6,
      });

      popupRef.current?.setPosition(webMercator);

      if (popupElRef.current) {
        popupElRef.current.style.display = "block";
        popupElRef.current.style.opacity = "1";
      }

      // dispatch(
      //   setInitialStateValue({
      //     key: "project_id",
      //     value: monitoringGeojson?.tpro_id || "",
      //   })
      // );
    }
  }, [monitoringGeojson]);

  const changeLayerLabel = (labelName) => {
    if (!bingLayer) return;
    const bingSource = new BingMaps({
      key: "AnObC3Et-5WiYvAPWJDzRcz7bZQxW9aJCbwc1M2d063x9tf0UCasetzWGLAnxpMs",
      imagerySet: labelName,
    });
    bingLayer.setSource(bingSource);
  };

  const rightPanel = (name, status) => {
    setBaseMap(false);
    setFilterState(false);
    switch (name) {
      case "BaseMap":
        setBaseMap(status);
        break;
      case "Filter":
        setFilterState(status);
        break;
      default:
        break;
    }
  };

  return (
    <>
      <div className="map-container">
        <div className="map_left_panel">
          <div
            id="map"
            className="map"
            style={{ height: "100%", width: "100%" }}
          ></div>
          <div id="progress"></div>
          <div id="mouse-position"></div>
          <div
            ref={popupElRef}
            className="ol-popup"
            style={{ display: "none" }}
          >
            <div className="ol-popup-content">
              <div className="popup">
                <div className="popup-header d-flex justify-content-between align-items-center mb-2">
                  <span className="font-bold text-primary text-[12px]">
                    Details
                  </span>
                </div>

                {popupDetails?.project_id ? (
                  <div className="p-2 max-w-md bg-white rounded-xl shadow-md border border-gray-200 h-40 overflow-y-auto">
                    <div className="w-[340px] max-w-[340px] p-3 space-y-3">
                      <span className="text-sm font-semibold text-blue-700 block">
                        {popupDetails?.project_title || ""}
                      </span>

                      <div className="flex gap-1 text-[12px]">
                        <span className="font-medium whitespace-nowrap">
                          Monitoring Created By:
                        </span>
                        <span>{popupDetails?.created_by_name || "--"}</span>
                      </div>
                      <div className="flex gap-1 text-[12px]">
                        <span className="font-medium whitespace-nowrap">
                          Monitoring Created At:
                        </span>
                        <span>
                          {popupDetails?.created_at
                            ? moment(popupDetails?.created_at).format(
                                "DD MMM YYYY",
                              )
                            : "--"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    No details available.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
