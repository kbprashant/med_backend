/**
 * Schedule Start Notification Handler
 * Sends notifications when a doctor's schedule starts
 */

const prisma = require('../config/database');
const { sendNotificationToUser, sendNotificationToDoctor } = require('../services/pushNotificationService');

/**
 * Send schedule start notifications
 * Called periodically (e.g., every minute) to notify doctor and confirmed patients
 */
exports.sendScheduleStartNotifications = async (req, res) => {
  try {
    // Get current date and time
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Format current time as HH:mm for comparison with schedule.startTime
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMinute = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;

    console.log('[SCHEDULE START NOTIFICATION]');
    console.log('  - Current time:', currentTime);
    console.log('  - Today:', today.toLocaleDateString());
    
    // Find all confirmed appointments for today that haven't sent start notification yet
    const appointmentsToNotify = await prisma.appointment.findMany({
      where: {
        appointmentDate: {
          gte: today,
          lt: tomorrow
        },
        status: 'confirmed',
        appointmentStartNotificationSent: false
      },
      include: {
        doctor: {
          select: {
            id: true,
            name: true
          }
        },
        patient: {
          select: {
            id: true,
            name: true
          }
        },
        schedule: {
          select: {
            id: true,
            startTime: true,
            endTime: true
          }
        }
      }
    });

    if (appointmentsToNotify.length === 0) {
      console.log('[SCHEDULE START NOTIFICATION] No appointments to notify');
      return res.status(200).json({
        success: true,
        message: 'No schedule start notifications to send',
        notified: 0
      });
    }

    console.log(`[SCHEDULE START NOTIFICATION] Found ${appointmentsToNotify.length} appointments to check`);

    let notificationCount = 0;
    const appointmentIds = [];

    // Process each appointment
    for (const appointment of appointmentsToNotify) {
      const schedule = appointment.schedule;
      if (!schedule) {
        console.log(`[SCHEDULE START NOTIFICATION] Skipping appointment ${appointment.id} - No schedule found`);
        continue;
      }

      // Check if current time >= schedule start time
      if (currentTime >= schedule.startTime) {
        console.log(`[SCHEDULE START NOTIFICATION] Schedule ${schedule.id} has started at ${schedule.startTime}`);
        
        appointmentIds.push(appointment.id);
        notificationCount++;

        // Send notification to doctor
        sendNotificationToDoctor(
          appointment.doctorId,
          'Schedule Started',
          `Your schedule starting at ${schedule.startTime} has begun. ${appointmentsToNotify.length} patient(s) in queue.`,
          'schedule'
        ).catch((e) => console.error('[FCM] schedule start doctor notify error:', e.message));

        // Send notification to confirmed patient
        sendNotificationToUser(
          appointment.patientId,
          'Your Appointment is Starting',
          `Your appointment with Dr. ${appointment.doctor.name} is starting now. Please be ready.`,
          'appointment'
        ).catch((e) => console.error('[FCM] schedule start patient notify error:', e.message));

        console.log(`[SCHEDULE START NOTIFICATION] Notified doctor and patient for appointment ${appointment.id}`);
      }
    }

    // Update all notified appointments to mark notification as sent
    if (appointmentIds.length > 0) {
      await prisma.appointment.updateMany({
        where: {
          id: { in: appointmentIds }
        },
        data: {
          appointmentStartNotificationSent: true
        }
      });

      console.log(`[SCHEDULE START NOTIFICATION] Updated ${appointmentIds.length} appointments`);
    }

    return res.status(200).json({
      success: true,
      message: 'Schedule start notifications sent successfully',
      notified: notificationCount
    });

  } catch (error) {
    console.error('[SCHEDULE START NOTIFICATION] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error sending schedule start notifications',
      error: error.message
    });
  }
};

/**
 * Get upcoming schedules for a doctor
 * Returns all schedules starting within the next hour
 */
exports.getUpcomingSchedules = async (req, res) => {
  try {
    const { doctorId } = req.params;

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID is required'
      });
    }

    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    // Get all confirmed appointments for this doctor in the next hour
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          lt: new Date(oneHourLater.getFullYear(), oneHourLater.getMonth(), oneHourLater.getDate() + 1)
        },
        status: 'confirmed'
      },
      include: {
        schedule: {
          select: {
            startTime: true,
            endTime: true
          }
        },
        patient: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        appointmentDate: 'asc'
      }
    });

    return res.status(200).json({
      success: true,
      appointments: upcomingAppointments
    });

  } catch (error) {
    console.error('Error getting upcoming schedules:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching upcoming schedules',
      error: error.message
    });
  }
};
