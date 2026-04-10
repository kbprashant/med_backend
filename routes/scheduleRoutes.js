const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const authenticate = require('../middleware/authenticate');

// Get available time slots (public)
router.get('/timeslots', scheduleController.getAvailableTimeSlots);

// Get authenticated doctor's schedules (protected)
router.get('/my-schedules', authenticate, scheduleController.getMySchedules);

// Get schedules for a doctor (public)
router.get('/doctor/:doctorId', scheduleController.getDoctorSchedules);

// Get specific schedule (public)
router.get('/:id', scheduleController.getSchedule);

// Protected Routes (require authentication for doctors)
router.post('/', authenticate, scheduleController.createSchedule);
router.put('/:id', authenticate, scheduleController.updateSchedule);
router.delete('/:id', authenticate, scheduleController.deleteSchedule);

module.exports = router;
