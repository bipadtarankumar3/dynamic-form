const express = require('express');
const multer = require('multer')();
const ctrl = require('./employeeVolunteering.controller');
const { authenticateToken } = require('../../middlewares/auth.middleware');

const router = express.Router();

// 1. PROGRAMS API
router.get('/programs', authenticateToken, ctrl.getPrograms);
router.get('/programs/:id', authenticateToken, ctrl.getProgramById);
router.post('/programs', authenticateToken, multer.any(), ctrl.createProgram);
router.put('/programs/:id', authenticateToken, multer.any(), ctrl.updateProgram);
router.delete('/programs/:id', authenticateToken, ctrl.deleteProgram);

// 2. EVENTS API
router.get('/events', authenticateToken, ctrl.getEvents);
router.get('/events/:id', authenticateToken, ctrl.getEventById);
router.post('/events', authenticateToken, multer.any(), ctrl.createEvent);
router.put('/events/:id', authenticateToken, multer.any(), ctrl.updateEvent);
router.delete('/events/:id', authenticateToken, ctrl.deleteEvent);

// Lifecycle transitions
router.post('/events/:id/submit-approval', authenticateToken, ctrl.submitEventForApproval);
router.post('/events/:id/publish', authenticateToken, ctrl.publishEvent);
router.post('/events/:id/closure', authenticateToken, multer.any(), ctrl.saveEventClosure);
router.post('/events/:id/story', authenticateToken, multer.any(), ctrl.saveEventStory);

// 3. ATTENDANCE & VOLUNTEERS API
router.get('/events/:id/volunteers', authenticateToken, ctrl.getEventVolunteers);
router.put('/events/:id/volunteers/:volunteerId/attendance', authenticateToken, multer.any(), ctrl.updateVolunteerAttendance);
router.post('/events/:id/volunteers/walk-in', authenticateToken, multer.any(), ctrl.addWalkInVolunteer);

// 4. EMPLOYEE SELF-SERVICE PORTAL API
router.get('/portal/events', authenticateToken, ctrl.getPortalEvents);
router.post('/portal/rsvp', authenticateToken, ctrl.submitPortalRsvp);
router.post('/portal/feedback', authenticateToken, multer.any(), ctrl.submitPortalFeedback);

module.exports = router;
