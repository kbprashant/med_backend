/**
 * firebaseService.js
 *
 * Initializes Firebase Admin SDK and exports the admin instance.
 *
 * Credential resolution order:
 *  1. FIREBASE_SERVICE_ACCOUNT env var  — full JSON string
 *  2. FIREBASE_SERVICE_ACCOUNT_PATH env var — path to JSON file
 *  3. ./firebase-service-account.json   — conventional file in project root
 *
 * Usage:
 *   const { admin, sendNotification } = require('./firebaseService');
 */

const path = require('path');

let admin = null;

(function initFirebase() {
  try {
    admin = require('firebase-admin');

    if (admin.apps.length > 0) {
      // Already initialized (e.g. by pushNotificationService loaded first)
      return;
    }

    let credential;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      credential = admin.credential.cert(serviceAccount);
      console.log('[Firebase] Initialized from FIREBASE_SERVICE_ACCOUNT env var.');
    } else {
      // Try FIREBASE_SERVICE_ACCOUNT_PATH, then conventional filename
      const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
        ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
        : path.join(__dirname, '..', 'firebase-service-account.json');

      // eslint-disable-next-line import/no-dynamic-require
      const serviceAccount = require(filePath);
      credential = admin.credential.cert(serviceAccount);
      console.log(`[Firebase] Initialized from file: ${filePath}`);
    }

    admin.initializeApp({ credential });
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND' || err instanceof SyntaxError) {
      console.warn('[Firebase] Service account key not found or invalid.');
      console.warn('[Firebase] Push notifications are disabled until credentials are configured.');
      console.warn('[Firebase] → Set FIREBASE_SERVICE_ACCOUNT in .env, or');
      console.warn('[Firebase] → Place firebase-service-account.json in the med_backend/ folder.');
    } else {
      console.error('[Firebase] Initialization error:', err.message);
    }
    admin = null;
  }
})();

/**
 * Send a push notification to a single FCM device token.
 *
 * @param {string} token   - FCM device registration token
 * @param {string} title   - Notification title
 * @param {string} message - Notification body
 * @param {object} [data]  - Optional key-value data payload
 * @returns {Promise<string|null>} FCM message ID, or null if not sent
 */
async function sendNotification(token, title, message, data = {}) {
  if (!admin || !token) return null;

  try {
    const messageId = await admin.messaging().send({
      token,
      notification: { title, body: message },
      data: { title, body: message, ...data },
      android: {
        priority: 'high',
        notification: { sound: 'default', channelId: 'medtrack_notifications' },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
    });
    return messageId;
  } catch (err) {
    console.error('[Firebase] sendNotification error:', err.message);
    return null;
  }
}

module.exports = { admin, sendNotification };
