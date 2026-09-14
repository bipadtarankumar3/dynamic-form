import AnimalCampsIcon from "@/assets/image/dashboard/AnimalCamps-con.png";
import MedicineIcon from "@/assets/image/dashboard/medicine-icon.png";
import MegaCampIcon from "@/assets/image/dashboard/MegaCamp-icon.png";
import MMUIcon from "@/assets/image/dashboard/MMU-icon.png";
import ScholarshipIcon from "@/assets/image/dashboard/scholarship-icon.png";
import ScholarshipIcon1 from "@/assets/image/dashboard/Scholarship-icon1.png";
import SchoolIcon from "@/assets/image/dashboard/school-icon.png";
import SHGsIcon from "@/assets/image/dashboard/SHGs-icon.png";
import "antd/dist/reset.css";
import { lazy, Suspense, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { setInitialStateValue } from "../../../store/slices/monitoringGeojsonSlice";
const MapView = lazy(() => import("../map/MapView"));
import AnimalCampDT from "./AnimalCampDT";
import EduScholarshipDT from "./EduScholarshipDT";
import ItemSuppliedDT from "./ItemSuppliedDT";
import MegaCampDT from "./MegaCampDT";
import MMUOrganizedDT from "./MMUOrganizedDT";
import SHGDT from "./SHGDT";
import { Spin } from "antd";

const MonitoringCardView = (props) => {
  const { dashboardCounts } = props;
  const dispatch = useDispatch();
  const [type, setType] = useState("");

  const handleOpen = (type) => {
    setType(type);
  };

  const getCardClass = (cardType) =>
    `rounded-lg px-3 py-2 shadow-sm cursor-pointer transition flex items-center gap-2
   ${
     type === cardType
       ? "monitoring-card active text-white shadow-lg scale-[1.02]"
       : "monitoring-card   text-white hover:shadow-md"
   }`;

  useEffect(() => {
    dispatch(setInitialStateValue({ key: "type", value: type }));
  }, [type]);
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-4 lg:gap-6 mt-2">
        <div className="w-full">
          <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
            <div
              onClick={() => handleOpen("edu_scholarship")}
              className={`${getCardClass("edu_scholarship")} bg1`}
            >
              <div className="flex flex-col gap-2">
                <span className="heading">Total Scholarships Provided</span>
                <div className="flex flex-col gap-2">
                  <p className="subheading">
                    Total -{" "}
                    {dashboardCounts?.total_scholarships_count?.total_count ||
                      0}
                  </p>
                </div>
              </div>
              <div className="right-side-img">
                <img src={ScholarshipIcon} alt="" />
              </div>
            </div>

            <div
              onClick={() => handleOpen("items_supplied_at_school")}
              // className={getCardClass("items_supplied_at_school")}
              className={`${getCardClass("items_supplied_at_school")} bg2`}
            >
              <div className="flex flex-col gap-2">
                <span className="heading">Total Items Supplied at School</span>
                <div className="flex flex-col gap-2">
                  <p className="subheading">
                    Total -{" "}
                    {dashboardCounts?.items_supplied_at_school_count
                      ?.total_count || 0}
                  </p>
                </div>
              </div>
              <div className="right-side-img">
                <img src={SchoolIcon} alt="" />
              </div>
            </div>

            <div
              onClick={() => handleOpen("mmu_organized")}
              // className={getCardClass("mmu_organized")}
              className={`${getCardClass("mmu_organized")} bg3`}
            >
              <div className="flex flex-col gap-2">
                <span className="heading">Total MMU Organized</span>
                <div className="flex flex-col gap-2">
                  <p className="subheading">
                    Total -{" "}
                    {dashboardCounts?.mmu_organized_count?.total_count || 0}
                  </p>
                </div>
              </div>
              <div className="right-side-img">
                <img src={MMUIcon} alt="" />
              </div>
            </div>

            <div
              onClick={() => handleOpen("mega_camp")}
              // className={getCardClass("mega_camp")}
              className={`${getCardClass("mega_camp")} bg4`}
            >
              <div className="flex flex-col gap-2">
                <span className="heading">Total Mega Camp Organized</span>
                <div className="flex flex-col gap-2">
                  <p className="subheading">
                    Total -{" "}
                    {dashboardCounts?.mega_camp_organized_count?.total_count ||
                      0}
                  </p>
                </div>
              </div>
              <div className="right-side-img">
                <img src={MegaCampIcon} alt="" className="SHGsIcon" />
              </div>
            </div>

            <div
              onClick={() => handleOpen("animal_camp")}
              // className={getCardClass("animal_camp")}
              className={`${getCardClass("animal_camp")} bg2`}
            >
              <div className="flex flex-col gap-2">
                <span className="heading">Total Animal Camps Organized</span>
                <div className="flex flex-col gap-2">
                  <p className="subheading">
                    Total -{" "}
                    {dashboardCounts?.animal_camps_organized_count
                      ?.total_count || 0}
                  </p>
                </div>
              </div>
              <div className="right-side-img">
                <img src={AnimalCampsIcon} alt="" />
              </div>
            </div>

            <div
              onClick={() => handleOpen("shg")}
              // className={getCardClass("shg")}
              className={`${getCardClass("shg")} bg1`}
            >
              <div className="flex flex-col gap-2">
                <span className="heading">Total SHGs Formed</span>
                <div className="flex flex-col gap-2">
                  <p className="subheading">
                    Total -{" "}
                    {dashboardCounts?.sgh_formed_count?.total_count || 0}
                  </p>
                </div>
              </div>
              <div className="right-side-img">
                <img src={SHGsIcon} alt="" className="SHGsIcon" />
              </div>
            </div>

            <div
              onClick={() => handleOpen("total_scholarships_amount")}
              // className={getCardClass("total_scholarships_amount")}
              className={`${getCardClass("total_scholarships_amount")} bg4`}
            >
              <div className="flex flex-col gap-2">
                <span className="heading">
                  Total Amount Disbursed in Scholarship
                </span>
                <div className="flex flex-col gap-2">
                  <p className="subheading">
                    Total - ₹
                    {dashboardCounts?.total_scholarships_amount?.total_amount ||
                      0}
                  </p>
                </div>
              </div>
              <div className="right-side-img">
                <img src={ScholarshipIcon1} alt="" />
              </div>
            </div>

            <div
              onClick={() => handleOpen("animal_camp_medicine_amount")}
              // className={getCardClass("animal_camp_medicine_amount")}
              className={`${getCardClass("animal_camp_medicine_amount")} bg2`}
            >
              <div className="flex flex-col gap-2">
                <span className="heading">Total Amount in Medicine Cost</span>
                <div className="flex flex-col gap-2">
                  <p className="subheading">
                    Total - ₹
                    {dashboardCounts?.animal_camps_medicine_amount
                      ?.total_amount || 0}
                  </p>
                </div>
              </div>
              <div className="right-side-img">
                <img src={MedicineIcon} alt="" />
              </div>
            </div>
          </div>
        </div>
        <div className="w-full shadow-md rounded hover:shadow-lg transition-all border border-gray-200 relative h-[550px]">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                <Spin size="large" />
              </div>
            }
          >
            <MapView />
          </Suspense>
        </div>
      </div>
      {type === "edu_scholarship" ? (
        <EduScholarshipDT
          type="edu_scholarship"
          title="Total Scholarships Provided"
          color_code="#ffe5d6"
        />
      ) : type === "items_supplied_at_school" ? (
        <ItemSuppliedDT type="items_supplied_at_school" color_code="#ead4ff" />
      ) : type === "mmu_organized" ? (
        <MMUOrganizedDT type="mmu_organized" color_code="#d6d2ff" />
      ) : type === "mega_camp" ? (
        <MegaCampDT type="mega_camp" color_code="#fff4ce" />
      ) : type === "animal_camp" ? (
        <AnimalCampDT
          type="animal_camp"
          title="Total Animal Camps Organized"
          color_code="#ead4ff"
        />
      ) : type === "shg" ? (
        <SHGDT type="shg" color_code="#ffe5d6" />
      ) : type === "total_scholarships_amount" ? (
        <EduScholarshipDT
          type="total_scholarships_amount"
          title="Total Amount Disbursed in Scholarship"
          color_code="#fff4ce"
        />
      ) : type === "animal_camp_medicine_amount" ? (
        <AnimalCampDT
          type="animal_camp_medicine_amount"
          title="Total Amount in Medicine Cost"
          color_code="#ead4ff"
        />
      ) : null}
    </>
  );
};

export default MonitoringCardView;
