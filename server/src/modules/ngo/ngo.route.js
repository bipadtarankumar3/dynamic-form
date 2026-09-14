// server/src/modules/ngo/ngo.route.js
// ============================================================
// NGO Routes (Profile, Due Diligence, RFPs, Proposals, Ratings)
// Mounted at: /api/v1/ngo & /api/v1/admin/ngo
// ============================================================

const express = require("express");
const ctrl = require("./ngo.controller");
const { checkPermission, checkAnyPermission } = require("../../middlewares/checkPermission.middleware");

const router = express.Router();

// 0. NGO Registrations Listing & Manager Status Update
router.get("/registrations", ctrl.getNgoRegistrations);
router.get("/registrations/:id", ctrl.getNgoRegistrationDetail);
router.put("/registrations/:id/status", ctrl.updateRegistrationStatus);

const multer = require("multer")();

// 0.1 NGO Profile & Due Diligence Status for Logged-In User
router.get("/profile-status", ctrl.getNgoProfileStatus);

// 0.2 Dedicated Profile API
router.get("/profile", ctrl.getNgoProfile);
router.post("/profile", multer.any(), ctrl.saveNgoProfile);

// 0.3 Dedicated Versioned Due Diligence API
router.get("/due-diligence", ctrl.getNgoDueDiligence);
router.post("/due-diligence", multer.any(), ctrl.saveNgoDueDiligence);
router.get("/due-diligence/versions", ctrl.getNgoDueDiligenceVersions);
router.get("/due-diligence/versions/:version", ctrl.getNgoDueDiligenceVersionDetail);

// 0.4 Dedicated NGO Projects Listing API
router.get("/projects", ctrl.getNgoProjects);

// 1. Admin / Manager Approve Implementation Partner & Auto-Create User Account (Default@123)
router.post("/approve", checkAnyPermission(undefined, ["approve", "edit", "add"]), ctrl.approvePartner);

// 2. Fetch Approved NGOs for Admin Float RFP Dropdown
router.get("/approved-ngos", ctrl.getApprovedNgos);

// 3. Fetch Master Evaluation Criteria from t_frm_criteria
router.get("/criteria", ctrl.getMasterCriteria);

// 4. Float RFP to Selected NGOs
router.post("/float", ctrl.floatRfp);

// 5. Fetch Active RFP Opportunities for Logged-In NGO (Dedicated Open & Closed APIs)
router.get("/open-rfp", ctrl.getOpenRfps);
router.get("/closed-rfp", ctrl.getClosedRfps);
router.get("/rfp-opportunities", ctrl.getRfpOpportunities);

// 6. Admin NGO Evaluation & Rating Submission
router.post("/evaluation/rate", ctrl.saveNgoEvaluation);

// 7. NGO Submit Floated RFP Proposal
router.post("/submit-proposal", ctrl.submitRfpProposal);
router.get("/my-proposal/:rfpId", ctrl.getMyProposal);
router.get("/my-proposal", ctrl.getMyProposal);

// 8. Admin: Get all submitted proposals for an RFP
router.get("/submitted-proposals", ctrl.getSubmittedProposals);

// 9. Admin: Save criteria-wise scores for a proposal
router.post("/score", ctrl.saveCriteriaScore);

// 10. Admin / Approver: Tag selected NGO partner for RFP
router.post("/select-partner", ctrl.selectPartner);

// 11. Admin / Approver: Get approval track timeline for RFP
router.get("/approval-track", ctrl.getApprovalTrack);

module.exports = router;
