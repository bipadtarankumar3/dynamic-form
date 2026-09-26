const express = require('express');
const multer = require('multer')();
const ctrl = require('./ngo.controller');
const { authenticateToken } = require('../../middlewares/auth.middleware');

const router = express.Router();

// Apply auth middleware to NGO endpoints
router.use(authenticateToken);

// 0. NGO Registrations Listing & Manager Status Update
router.get('/registrations', ctrl.getNgoRegistrations);
router.get('/registrations/:id', ctrl.getNgoRegistrationDetail);
router.put('/registrations/:id/status', ctrl.updateRegistrationStatus);

// 0.1 NGO Profile & Due Diligence Status for Logged-In User
router.get('/profile-status', ctrl.getNgoProfileStatus);

// 0.2 Dedicated Profile API
router.get('/profile', ctrl.getNgoProfile);
router.post('/profile', multer.any(), ctrl.saveNgoProfile);

// 0.3 Dedicated Versioned Due Diligence API
router.get('/due-diligence', ctrl.getNgoDueDiligence);
router.post('/due-diligence', multer.any(), ctrl.saveNgoDueDiligence);
router.get('/due-diligence/versions', ctrl.getNgoDueDiligenceVersions);
router.get('/due-diligence/versions/:version', ctrl.getNgoDueDiligenceVersionDetail);

// 0.4 Dedicated NGO Projects Listing API
router.get('/projects', ctrl.getNgoProjects);

// 1. Admin / Manager Approve Implementation Partner & Auto-Create User Account
router.post('/approve', ctrl.approvePartner);

// 2. Fetch Approved NGOs for Admin Float RFP Dropdown
router.get('/approved-ngos', ctrl.getApprovedNgos);

// 3. Fetch Master Evaluation Criteria
router.get('/criteria', ctrl.getMasterCriteria);

// 4. Float RFP to Selected NGOs
router.post('/float', ctrl.floatRfp);

// 5. Fetch Active RFP Opportunities for Logged-In NGO
router.get('/open-rfp', ctrl.getOpenRfps);
router.get('/closed-rfp', ctrl.getClosedRfps);
router.get('/rfp-opportunities', ctrl.getRfpOpportunities);

// 6. Admin NGO Evaluation & Rating Submission
router.post('/evaluation/rate', ctrl.saveNgoEvaluation);

// 7. NGO Submit Floated RFP Proposal
router.post('/submit-proposal', multer.any(), ctrl.submitRfpProposal);
router.get('/my-proposal/:rfpId', ctrl.getMyProposal);
router.get('/my-proposal', ctrl.getMyProposal);

// 8. Admin: Get all submitted proposals for an RFP
router.get('/submitted-proposals', ctrl.getSubmittedProposals);

// 9. Admin: Save criteria-wise scores for a proposal
router.post('/score', ctrl.saveCriteriaScore);

// 10. Admin / Approver: Tag selected NGO partner for RFP
router.post('/select-partner', ctrl.selectPartner);

// 11. Admin / Approver: Get approval track timeline for RFP
router.get('/approval-track', ctrl.getApprovalTrack);

module.exports = router;
