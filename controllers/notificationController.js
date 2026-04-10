const prisma = require('../config/database');

/**
 * GET /api/notifications
 * Returns notifications for the currently authenticated user (patient or doctor).
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;
    const doctorId = req.user?.doctorId;

    const where = doctorId ? { doctorId } : { userId };

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read.
 */
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * PATCH /api/notifications/mark-all-read
 * Mark all notifications as read for the authenticated user.
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    const doctorId = req.user?.doctorId;

    const where = doctorId ? { doctorId, isRead: false } : { userId, isRead: false };

    await prisma.notification.updateMany({ where, data: { isRead: true } });

    return res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * POST /api/notifications/save-device-token
 * Save or update the FCM device token for the authenticated user.
 */
exports.saveDeviceToken = async (req, res) => {
  try {
    const token = req.body?.token || req.body?.fcmToken;
    const userId = req.user?.id;
    const doctorId = req.user?.doctorId;

    if (!token || typeof token !== 'string' || token.trim() === '') {
      return res.status(400).json({ success: false, message: 'A valid device token is required' });
    }

    if (doctorId) {
      // Verify the doctor exists before updating
      const doctorExists = await prisma.doctor.findUnique({
        where: { id: doctorId },
        select: { id: true },
      });

      if (!doctorExists) {
        console.warn(`Doctor not found: ${doctorId}`);
        return res.status(404).json({ success: false, message: 'Doctor profile not found' });
      }

      await prisma.doctor.update({
        where: { id: doctorId },
        data: { fcmToken: token.trim(), updatedAt: new Date() },
      });
    } else if (userId) {
      // Verify the user exists before updating
      const userExists = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!userExists) {
        console.warn(`User not found: ${userId}`);
        return res.status(404).json({ success: false, message: 'User profile not found' });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { fcmToken: token.trim(), updatedAt: new Date() },
      });
    } else {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    return res.status(200).json({ success: true, message: 'Device token saved successfully' });
  } catch (error) {
    console.error('Error saving device token:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
