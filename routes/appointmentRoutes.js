const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const scheduleStartNotificationHandler = require('../controllers/scheduleStartNotificationHandler');
const authenticate = require('../middleware/authenticate');

// All routes require authentication
router.use(authenticate);

// ==================== DOCTOR DASHBOARD ROUTES ====================
// Get today's pending requests
router.get('/doctor/today/requests', appointmentController.getTodayRequests);

// Get today's confirmed bookings
router.get('/doctor/today/bookings', appointmentController.getTodayBookings);

// Get doctor's live queue
router.get('/doctor/queue', appointmentController.getDoctorQueue);

// Accept appointment
router.put('/:id/accept', appointmentController.acceptAppointment);

// Reject appointment
router.put('/:id/reject', appointmentController.rejectAppointment);

// Complete appointment
router.put('/:id/complete', appointmentController.completeAppointment);

// ==================== GENERAL ROUTES ====================
// Appointment Management
router.post('/', appointmentController.bookAppointment);

// Patient Appointments (must come before /patient/:patientId)
router.get('/patient', appointmentController.getMyAppointments);
router.get('/patient/:patientId', appointmentController.getPatientAppointments);

// Doctor Appointments (from authenticated token) - MUST come before /:id
router.get('/doctor', appointmentController.getDoctorAppointmentsFromToken);

// Doctor Appointments (with specific doctor ID)
router.get('/doctor/:doctorId', appointmentController.getDoctorAppointments);

// Get specific appointment by ID - MUST come after /doctor and /patient routes
router.get('/:id', appointmentController.getAppointment);

// Update Appointment Status
router.patch('/:id/status', appointmentController.updateAppointmentStatus);

// Cancel Appointment
router.patch('/:id/cancel', appointmentController.cancelAppointment);

// Queue Management
router.get('/queue/status', appointmentController.getQueueStatus);
router.get('/queue/:appointmentId', appointmentController.getPatientQueuePosition);

// ==================== SCHEDULE START NOTIFICATION ROUTES ====================
// Send schedule start notifications (can be called by scheduled job or frontend)
router.post('/notifications/schedule-start', scheduleStartNotificationHandler.sendScheduleStartNotifications);

// Get upcoming schedules for a doctor
router.get('/upcoming/:doctorId', scheduleStartNotificationHandler.getUpcomingSchedules);

module.exports = router;
