// server/src/modules/employee-volunteering/employeeVolunteering.route.js
// ============================================================
// Employee Volunteering Routes
// ============================================================

const express = require("express");
const multer = require("multer")();
const ctrl = require("./employeeVolunteering.controller");

const router = express.Router();

// ------------------------------------------------------------
// 1. PROGRAMS API
// ------------------------------------------------------------
router.get("/programs", ctrl.getPrograms);
router.get("/programs/:id", ctrl.getProgramById);
router.post("/programs", multer.any(), ctrl.createProgram);
router.put("/programs/:id", multer.any(), ctrl.updateProgram);
router.delete("/programs/:id", ctrl.deleteProgram);

// ------------------------------------------------------------
// 2. EVENTS API
// ------------------------------------------------------------
router.get("/events", ctrl.getEvents);
router.get("/events/:id", ctrl.getEventById);
router.post("/events", multer.any(), ctrl.createEvent);
router.put("/events/:id", multer.any(), ctrl.updateEvent);
router.delete("/events/:id", ctrl.deleteEvent);

// Lifecycle transitions
router.post("/events/:id/submit-approval", ctrl.submitEventForApproval);
router.post("/events/:id/publish", ctrl.publishEvent);
router.post("/events/:id/closure", multer.any(), ctrl.saveEventClosure);
router.post("/events/:id/story", multer.any(), ctrl.saveEventStory);

// ------------------------------------------------------------
// 3. ATTENDANCE & VOLUNTEERS API
// ------------------------------------------------------------
router.get("/events/:id/volunteers", ctrl.getEventVolunteers);
router.put("/events/:id/volunteers/:volunteerId/attendance", multer.any(), ctrl.updateVolunteerAttendance);
router.post("/events/:id/volunteers/walk-in", multer.any(), ctrl.addWalkInVolunteer);

// ------------------------------------------------------------
// 4. EMPLOYEE SELF-SERVICE PORTAL API
// ------------------------------------------------------------
router.get("/portal/events", ctrl.getPortalEvents);
router.post("/portal/rsvp", ctrl.submitPortalRsvp);
router.post("/portal/feedback", multer.any(), ctrl.submitPortalFeedback);

module.exports = router;
