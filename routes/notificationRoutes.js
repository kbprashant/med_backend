const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const notificationController = require('../controllers/notificationController');

// All notification routes require authentication
router.use(authenticate);

// GET /api/notifications — fetch all notifications for the current user
router.get('/', notificationController.getNotifications);

// POST /api/notifications/save-device-token — register FCM token (original)
router.post('/save-device-token', notificationController.saveDeviceToken);

// POST /api/notifications/save-token — alias used by Flutter client
router.post('/save-token', notificationController.saveDeviceToken);

// PATCH /api/notifications/mark-all-read — mark all notifications read
router.patch('/mark-all-read', notificationController.markAllAsRead);

// PATCH /api/notifications/:id/read — mark single notification read
router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;
