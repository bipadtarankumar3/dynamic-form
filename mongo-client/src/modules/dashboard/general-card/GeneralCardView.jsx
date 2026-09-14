import BudgetIcon from "@/assets/image/dashboard/budget-icon.png";
import NgoIcon from "@/assets/image/dashboard/ngo-icon.png";
import ProjectIcon from "@/assets/image/dashboard/project-icon.png";
import ProposalsIcon from "@/assets/image/dashboard/Proposals-icon.png";
import StudentsIcon from "@/assets/image/dashboard/students-icon.png";
import TrainingIcon from "@/assets/image/dashboard/training-icon.png";
import UtilizationIcon from "@/assets/image/dashboard/utilization-icon.png";
import "antd/dist/reset.css";
import { useState } from "react";
import { FaChalkboardTeacher, FaFemale, FaMale, FaMapMarkerAlt, FaUserCheck, FaUserTimes } from "react-icons/fa";
import BudgetCardDrawer from "./budget/BudgetCardDrawer";
import NgoCardDrawer from "./NgoCardDrawer";
import ProjectCardDrawer from "./project/ProjectCardDrawer";
import ProposalCardDrawer from "./proposal/ProposalCardDrawer";
import StudentCoverageDrawer from "./StudentCoverageDrawer";
import TrainingCoverageDrawer from "./TrainingCoverageDrawer";
import UtilizationCardDrawer from "./utilization/UtilizationCardDrawer";

const formatIndianShortCurrency = (value) => {
  const num = Number(value ?? 0);

  if (num >= 10000000) {
    // Crore
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  } else if (num >= 100000) {
    // Lakh
    return `₹${(num / 100000).toFixed(2)} L`;
  } else if (num >= 1000) {
    // Thousand
    return `₹${(num / 1000).toFixed(2)} K`;
  } else {
    return `₹${num.toFixed(2)}`;
  }
};

const GeneralCardView = (props) => {
  const { dashboardCounts } = props;
  const [proposalOpen, setProposalOpen] = useState(false);
  const [peojectOpen, setProjectOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [ngoOpen, setNgoOpen] = useState(false);
  const [studentCoverageOpen, setStudentCoverageOpen] = useState(false);
  const [trainingCoverageOpen, setTrainingCoverageOpen] = useState(false);
  const [utilizationOpen, setUtilizationOpen] = useState(false);

  const handleOpen = (type) => {
    if (type === "proposal") {
      setProposalOpen(true);
    } else if (type === "project") {
      setProjectOpen(true);
    } else if (type === "budget") {
      setBudgetOpen(true);
    } else if (type === "ngo") {
      setNgoOpen(true);
    } else if (type === "student_coverage") {
      setStudentCoverageOpen(true);
    } else if (type === "training_coverage") {
      setTrainingCoverageOpen(true);
    } else if (type === "utilization") {
      setUtilizationOpen(true);
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          onClick={() => handleOpen("proposal")}
          className="dashboard-card bg-1">
      
          <div className="flex flex-col gap-1">
            <span className="heading">
              Proposals
            </span>
            <div className="flex flex-col gap-1">
              <p className="subheading">
                Total - {dashboardCounts?.proposal_count?.total_count || 0}
              </p>
              <p className="m-0 flex gap-2">
                <span className="text-pending" title="Pending">
                  P: {dashboardCounts?.proposal_count?.pending_count || 0}
                </span>
                <span className="text-approved" title="Approved">
                  A: {dashboardCounts?.proposal_count?.approved_count || 0}
                </span>
                <span className="text-resend" title="Resend">
                  R: {dashboardCounts?.proposal_count?.resend_count || 0}
                </span>
              </p>
            </div>
          </div>
          <div className="right-side-img">
            <img src={ProposalsIcon} alt="" />
          </div>
        </div>

        <div
          onClick={() => handleOpen("project")}
          className="dashboard-card bg-2"
        >
      

          <div className="flex flex-col gap-1">
            <span className="heading">
              Projects
            </span>
            <div className="flex flex-col gap-2">
              <p className="subheading">
                Total - {dashboardCounts?.project_count?.total_count || 0}
              </p>
              <p className="m-0 flex gap-2">
                <span className="text-pending" title="Pending">
                  P: {dashboardCounts?.project_count?.pending_count || 0}
                </span>
                <span className="text-approved" title="Approved">
                  A: {dashboardCounts?.project_count?.approved_count || 0}
                </span>
                <span className="text-resend" title="Resend">
                  R: {dashboardCounts?.project_count?.resend_count || 0}
                </span>
              </p>
            </div>
          </div>
             <div className="right-side-img">
            <img src={ProjectIcon} alt="" />
          </div>
        </div>

        <div
          onClick={() => handleOpen("budget")}
          className="dashboard-card bg-3">
          <div className="flex flex-col gap-1">
            <span className="heading">Budget</span>
            <div className="flex flex-col gap-2">
              <p className="subheading">
                Total - ₹
                {Number(
                  dashboardCounts?.budget_total?.total_amount ?? 0,
                ).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
           <div className="right-side-img">
            <img src={BudgetIcon} alt="" />
          </div>

        </div>

        <div
          onClick={() => handleOpen("utilization")}
          className="dashboard-card bg-4"
        >
          

          <div className="flex flex-col gap-1">
            <span className="heading">
              Utilization
            </span>
            <div className="flex flex-col gap-1">
              <p className="subheading">
                Total - ₹
                {Number(
                  dashboardCounts?.utilization_total?.total_amount ?? 0,
                ).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              {/* <p className="m-0 flex gap-2">
                <span className="text-yellow-600" title="Pending">
                  P:
                  {Number(
                    dashboardCounts?.utilization_total?.pending_amount ?? 0,
                  ).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="text-green-600" title="Approved">
                  A: {dashboardCounts?.utilization_total?.approved_amount || 0}
                </span>
                <span className="text-yellow-600" title="Resend">
                  R: {dashboardCounts?.utilization_total?.resend_amount || 0}
                </span>
              </p> */}
            </div>
          </div>
           <div className="right-side-img">
            <img src={UtilizationIcon} alt="" />
          </div>
        </div>

        <div
          onClick={() => handleOpen("ngo")}
          className="dashboard-card bg-4">
          <div className="flex flex-col gap-1">
            <span className="heading">
              NGO/Vendor
            </span>
            <div className="flex flex-col gap-1">
              <p className="subheading">
                Total - {dashboardCounts?.ngo_count?.total_count || 0}
              </p>
            </div>
          </div>
            <div className="right-side-img">
            <img src={NgoIcon} alt="" />
          </div>
        </div>

        <div
          onClick={() => handleOpen("student_coverage")}
          className="dashboard-card bg-1">
          <div className="flex flex-col gap-1">
            <span className="heading">
              Students Coverage
            </span>
            <div className="flex flex-col gap-1">
              <p className="subheading">
                Total -{" "}
                {dashboardCounts?.students_coverage_count?.total_count || 0}
              </p>
              <p className="m-0 flex gap-2">
                <span className="male" title="Male">
                     <FaMale /> : {dashboardCounts?.students_coverage_count?.male_count || 0}
                </span>
                <span className="female" title="Female">
                   <FaFemale /> :{" "}
                  {dashboardCounts?.students_coverage_count?.female_count || 0}
                </span>
              </p>
            </div>
          </div>
           <div className="right-side-img">
            <img src={ StudentsIcon} alt="" />
          </div>
        </div>

        <div
          onClick={() => handleOpen("training_coverage")}
          className="dashboard-card bg-2">
          <div className="flex flex-col gap-1">
            <span className="heading">
              Coverage of Training
            </span>
            <div className="flex flex-col gap-2">
              <p className="subheading m-0 flex gap-2">
                <span className="text-pending" title="Enrolled">
                   <FaUserCheck /> : {" "}
                  {dashboardCounts?.training_coverage_count?.enrolled_count ||
                    0}
                </span>
                <span className="text-approved" title="Trained">
                  <FaChalkboardTeacher /> : {" "}
                  {dashboardCounts?.training_coverage_count?.trained_count || 0}
                </span>
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <p className="m-0 flex gap-2">
                <span className="text-pending" title="Placed ">
                    <FaMapMarkerAlt />  : {" "}
                  {dashboardCounts?.training_coverage_count?.placed_count || 0}
                </span>
                <span className="text-approved" title="Drop Out">
                   <FaUserTimes /> : {" "}
                  {dashboardCounts?.training_coverage_count?.dropout_count || 0}
                </span>
              </p>
            </div>
          </div>
          <div className="right-side-img">
            <img src={TrainingIcon} alt="" />
          </div>
        </div>
      </div>
    
      {/* Drawer */}
      {proposalOpen && (
        <ProposalCardDrawer
          open={proposalOpen}
          onClose={() => setProposalOpen(false)}
        />
      )}
      {peojectOpen && (
        <ProjectCardDrawer
          open={peojectOpen}
          onClose={() => setProjectOpen(false)}
        />
      )}
      {budgetOpen && (
        <BudgetCardDrawer
          open={budgetOpen}
          onClose={() => setBudgetOpen(false)}
        />
      )}
      {ngoOpen && (
        <NgoCardDrawer open={ngoOpen} onClose={() => setNgoOpen(false)} />
      )}
      {studentCoverageOpen && (
        <StudentCoverageDrawer
          open={studentCoverageOpen}
          onClose={() => setStudentCoverageOpen(false)}
        />
      )}
      {trainingCoverageOpen && (
        <TrainingCoverageDrawer
          open={trainingCoverageOpen}
          onClose={() => setTrainingCoverageOpen(false)}
        />
      )}
      {utilizationOpen && (
        <UtilizationCardDrawer
          open={utilizationOpen}
          onClose={() => setUtilizationOpen(false)}
        />
      )}
    </>
  );
};

export default GeneralCardView;
