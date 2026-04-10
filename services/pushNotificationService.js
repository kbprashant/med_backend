const prisma = require('../config/database');
// Delegate all Firebase admin work to the single source-of-truth firebaseService
const { admin, sendNotification: _fcmSend } = require('./firebaseService');

/**
 * Send a push notification to a patient (User) and persist it in DB.
 * @param {string} userId
 * @param {string} title
 * @param {string} message
 * @param {string} type  - e.g. "appointment", "general"
 */
async function sendNotificationToUser(userId, title, message, type = 'appointment') {
  try {
    // Persist notification regardless of whether FCM is enabled
    await prisma.notification.create({
      data: { userId, title, message, type },
    });

    if (!admin) return;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    if (!user?.fcmToken) return;

    const result = await _fcmSendWithCleanup(user.fcmToken, title, message, type, async () => {
      await prisma.user.update({ where: { id: userId }, data: { fcmToken: null } });
    });

    return result;
  } catch (error) {
    console.error('[FCM] sendNotificationToUser error:', error.message);
  }
}

/**
 * Send a push notification to a doctor and persist it in DB.
 * @param {string} doctorId
 * @param {string} title
 * @param {string} message
 * @param {string} type
 */
async function sendNotificationToDoctor(doctorId, title, message, type = 'appointment') {
  try {
    await prisma.notification.create({
      data: { doctorId, title, message, type },
    });

    if (!admin) return;

    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { fcmToken: true },
    });

    if (!doctor?.fcmToken) return;

    return await _fcmSendWithCleanup(doctor.fcmToken, title, message, type, async () => {
      await prisma.doctor.update({ where: { id: doctorId }, data: { fcmToken: null } });
    });
  } catch (error) {
    console.error('[FCM] sendNotificationToDoctor error:', error.message);
  }
}

/**
 * Internal helper: send via firebaseService and handle invalid-token cleanup.
 */
async function _fcmSendWithCleanup(token, title, body, type, onInvalidToken) {
  try {
    return await _fcmSend(token, title, body, { type });
  } catch (err) {
    if (
      err.code === 'messaging/registration-token-not-registered' ||
      err.code === 'messaging/invalid-registration-token'
    ) {
      console.warn('[FCM] Invalid token detected, clearing from DB.');
      await onInvalidToken();
    } else {
      console.error('[FCM] FCM send error:', err.message);
    }
  }
}

module.exports = { sendNotificationToUser, sendNotificationToDoctor };
