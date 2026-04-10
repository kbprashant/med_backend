const prisma = require('../config/database');
const { sendNotificationToUser, sendNotificationToDoctor } = require('../services/pushNotificationService');

// ============================================
// HELPER FUNCTIONS FOR SCHEDULE & TIME SLOTS
// ============================================

/**
 * Generate time slots from schedule start/end times (20-minute intervals)
 * @param {string} startTime - Format: "HH:mm" (e.g., "10:00")
 * @param {string} endTime - Format: "HH:mm" (e.g., "13:00")
 * @returns {Array<string>} Array of time slots in "hh:mm AM/PM" format
 */
function generateTimeSlots(startTime, endTime) {
  const slots = [];
  const INTERVAL_MINUTES = 20;

  // Parse times
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  let currentMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  while (currentMinutes < endMinutes) {
    const hour = Math.floor(currentMinutes / 60);
    const minute = currentMinutes % 60;

    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);

    const timeSlot = `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;
    slots.push(timeSlot);

    currentMinutes += INTERVAL_MINUTES;
  }

  return slots;
}

/**
 * Get day of week name from Date
 * @param {Date} date
 * @returns {string} Day name (Monday, Tuesday, etc.)
 */
function getDayOfWeek(date) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

/**
 * Find first available time slot for an appointment
 * @param {string} doctorId
 * @param {Date} appointmentDate
 * @returns {Object|null} { scheduleId, bookingTime } or null if no availability
 */
async function findAvailableSlot(doctorId, appointmentDate) {
  const dayOfWeek = getDayOfWeek(appointmentDate);

  // Get doctor's schedule for this day of week
  const schedule = await prisma.doctorSchedule.findFirst({
    where: {
      doctorId,
      dayOfWeek
    }
  });

  if (!schedule) {
    return null; // Doctor not available on this day
  }

  // Generate available time slots
  const slots = generateTimeSlots(schedule.startTime, schedule.endTime);

  // Get already booked appointments for this date and schedule
  const bookedAppointments = await prisma.appointment.findMany({
    where: {
      doctorId,
      scheduleId: schedule.id,
      appointmentDate: {
        equals: new Date(appointmentDate)
      },
      status: {
        in: ['pending', 'confirmed']
      }
    },
    select: { bookingTime: true }
  });

  const bookedTimes = bookedAppointments.map(apt => apt.bookingTime);

  // Find first available slot
  const availableSlot = slots.find(slot => !bookedTimes.includes(slot));

  if (!availableSlot) {
    return null; // No available slots
  }

  return {
    scheduleId: schedule.id,
    bookingTime: availableSlot
  };
}

// Book Appointment (Patient)
exports.bookAppointment = async (req, res) => {
  const patientId = req.user?.id; // Get from JWT token
  const { doctorId, appointmentDate, notes } = req.body;

  try {
    // Validation
    if (!patientId) {
      return res.status(401).json({
        success: false,
        message: 'Patient authentication required'
      });
    }

    if (!doctorId || !appointmentDate) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID and appointment date are required'
      });
    }

    // Check if patient exists
    const patient = await prisma.user.findUnique({
      where: { id: patientId }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Check if doctor exists
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId }
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    const appointmentDateObj = new Date(appointmentDate);

    // Find available time slot and schedule
    const slotInfo = await findAvailableSlot(doctorId, appointmentDateObj);

    if (!slotInfo) {
      return res.status(400).json({
        success: false,
        message: 'No available time slots for the selected date. Doctor may not be available on this day.'
      });
    }

    console.log('[SLOT INFO] Received slotInfo:');
    console.log('  - bookingTime:', slotInfo.bookingTime);
    console.log('  - scheduleId:', slotInfo.scheduleId);
    console.log('  - Full object:', JSON.stringify(slotInfo, null, 2));

    // Use a transaction to make queue number assignment atomic
    // This prevents race conditions with concurrent requests
    const appointment = await prisma.$transaction(async (tx) => {
      // ✅ VALIDATION: Check for ACTIVE appointments only
      // Patient CAN rebook AFTER completing previous appointment
      // We only block if they have a PENDING or CONFIRMED appointment
      const existingActive = await tx.appointment.findFirst({
        where: {
          patientId,
          appointmentDate: {
            equals: appointmentDateObj
          },
          scheduleId: slotInfo.scheduleId,
          status: {
            in: ['pending', 'confirmed']
          }
        }
      });

      if (existingActive) {
        throw new Error('ACTIVE_APPOINTMENT_EXISTS');
      }

      // Get next queue number by counting active queue slots
      // Count only appointments with queueNumber NOT NULL (active slots)
      // When appointments are completed/cancelled, queueNumber is set to NULL, freeing the queue slot
      const nextDay = new Date(appointmentDateObj);
      nextDay.setDate(nextDay.getDate() + 1);
      
      console.log('[QUEUE DEBUG] Finding active queue slots for assignment:');
      console.log('  - Doctor ID:', doctorId);
      console.log('  - Schedule ID:', slotInfo.scheduleId);
      console.log('  - Appointment Date (gte):', appointmentDateObj.toISOString());
      console.log('  - Next Day (lt):', nextDay.toISOString());
      
      const activeQueueCount = await tx.appointment.count({
        where: {
          doctorId,
          appointmentDate: {
            gte: appointmentDateObj,
            lt: nextDay
          },
          scheduleId: slotInfo.scheduleId,
          queueNumber: { not: null }  // Only count appointments with active queue positions
        }
      });

      const queueNumber = activeQueueCount + 1;

      console.log('[QUEUE DEBUG] Active queue count (queueNumber NOT NULL):', activeQueueCount);
      console.log('[QUEUE DEBUG] Assigning queue number:', queueNumber);

      // ⏰ Calculate booking time based on LAST patient in queue
      // Get the last (highest queue number) appointment to base time calculation on
      const lastPatientInQueue = await tx.appointment.findFirst({
        where: {
          doctorId,
          appointmentDate: {
            gte: appointmentDateObj,
            lt: nextDay
          },
          scheduleId: slotInfo.scheduleId,
          queueNumber: { not: null }
        },
        orderBy: { queueNumber: 'desc' },
        select: { queueNumber: true, bookingTime: true }
      });

      let calculatedBookingTime = slotInfo.bookingTime; // Fallback to selected time

      if (lastPatientInQueue && lastPatientInQueue.bookingTime) {
        // Add 20 minutes to the last patient's booking time
        console.log('[BOOKING TIME] Last patient time:', lastPatientInQueue.bookingTime);
        calculatedBookingTime = addMinutesToTimeString(lastPatientInQueue.bookingTime, 20);
        console.log('[BOOKING TIME] New patient time (last + 20 min):', calculatedBookingTime);
      } else if (slotInfo.scheduleId) {
        // Fallback: calculate from schedule start time if no one is in queue
        const schedule = await tx.doctorSchedule.findUnique({
          where: { id: slotInfo.scheduleId }
        });
        
        if (schedule) {
          calculatedBookingTime = calculateBookingTime(schedule.startTime, queueNumber);
          console.log('[BOOKING TIME] No one in queue, calculated from schedule: ' + schedule.startTime + ' -> ' + calculatedBookingTime);
        }
      }

      // ⏰ Validate that booking doesn't exceed session end time
      const schedule = await tx.doctorSchedule.findUnique({
        where: { id: slotInfo.scheduleId }
      });

      if (schedule) {
        const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
        const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
        const slotDuration = 20; // Default slot duration in minutes

        const bookingMinutes =
          startHour * 60 +
          startMinute +
          (queueNumber - 1) * slotDuration;

        const endMinutes = endHour * 60 + endMinute;

        if (bookingMinutes >= endMinutes) {
          throw new Error('SESSION_FULL');
        }

        console.log('[SESSION VALIDATION]');
        console.log('  - Start time:', schedule.startTime);
        console.log('  - End time:', schedule.endTime);
        console.log('  - Booking minutes:', bookingMinutes);
        console.log('  - End minutes:', endMinutes);
        console.log('  - Valid:', bookingMinutes < endMinutes);
        console.log('  - Calculated booking time:', calculatedBookingTime);
      }

      // Create appointment with schedule and booking time assigned
      console.log('[APPOINTMENT CREATE] Payload:');
      console.log('  - patientId:', patientId);
      console.log('  - doctorId:', doctorId);
      console.log('  - scheduleId:', slotInfo.scheduleId);
      console.log('  - appointmentDate:', appointmentDateObj);
      console.log('  - bookingTime (calculated by queue):', calculatedBookingTime);
      console.log('  - queueNumber:', queueNumber);
      console.log('  - status: pending');

      return await tx.appointment.create({
        data: {
          patientId,
          doctorId,
          scheduleId: slotInfo.scheduleId,
          appointmentDate: appointmentDateObj,
          bookingTime: calculatedBookingTime,
          queueNumber,
          status: 'pending',
          notes: notes || null
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              phoneNumber: true,
              email: true,
              dateOfBirth: true,
              gender: true,
            bloodGroup: true
          }
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
            hospital: true,
            clinicName: true,
            clinicAddress: true,
            phoneNumber: true
          }
        },
        schedule: true
      }
      });
    });

    // Notify the doctor about the new appointment request
    sendNotificationToDoctor(
      appointment.doctorId,
      'New Appointment Request',
      `${appointment.patient.name} has requested an appointment on ${appointmentDateObj.toLocaleDateString()} at ${appointment.bookingTime}.`,
      'appointment'
    ).catch((e) => console.error('[FCM] book notify error (doctor):', e.message));

    // Notify the patient that their appointment booking is pending confirmation
    sendNotificationToUser(
      appointment.patientId,
      'Appointment Request Submitted',
      `Your appointment request with Dr. ${appointment.doctor.name} on ${appointmentDateObj.toLocaleDateString()} at ${appointment.bookingTime} has been submitted and is awaiting confirmation.`,
      'appointment'
    ).catch((e) => console.error('[FCM] book notify error (patient):', e.message));

    return res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: appointment
    });

  } catch (error) {
    console.error('Error booking appointment:', error);
    
    // ✅ Handle ACTIVE appointment error
    if (error.message === 'ACTIVE_APPOINTMENT_EXISTS') {
      return res.status(400).json({
        success: false,
        message: 'You already have an active appointment for this schedule. Please complete or cancel it first.'
      });
    }

    // ✅ Handle SESSION_FULL error
    if (error.message === 'SESSION_FULL') {
      return res.status(400).json({
        success: false,
        message: 'This session is now full. No more appointments can be booked for this time slot.'
      });
    }
    
    // Special handling for constraint violations
    if (error.code === 'P2002') {
      console.error('[CONSTRAINT ERROR] Prisma unique constraint violation');
      console.error('  - Meta:', error.meta);
      console.error('  - Fields:', error.meta?.target);
      console.error('  - Full error:', JSON.stringify(error, null, 2));
    }
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      code: error.code || 'UNKNOWN'
    });
  }
};

// Get Appointment by ID
exports.getAppointment = async (req, res) => {
  const { id } = req.params;

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            email: true,
            dateOfBirth: true,
            gender: true,
            bloodGroup: true,
            address: true
          }
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
            hospital: true,
            clinicName: true,
            clinicAddress: true,
            phoneNumber: true,
            email: true
          }
        },
        schedule: true
      }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Recalculate booking time based on queue position
    if (appointment.schedule && appointment.queueNumber && appointment.schedule.startTime) {
      appointment.bookingTime = calculateBookingTime(appointment.schedule.startTime, appointment.queueNumber);
    }

    return res.status(200).json({
      success: true,
      data: appointment
    });

  } catch (error) {
    console.error('Error fetching appointment:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get Patient Appointments
exports.getPatientAppointments = async (req, res) => {
  const { patientId } = req.params;
  const { status, upcoming } = req.query;

  try {
    const where = { patientId };

    if (status) {
      where.status = status;
    }

    if (upcoming === 'true') {
      where.appointmentDate = {
        gte: new Date()
      };
      where.status = {
        in: ['pending', 'confirmed']
      };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      select: {
        id: true,
        patientId: true,
        doctorId: true,
        scheduleId: true,
        appointmentDate: true,
        queueNumber: true,
        status: true,
        bookingTime: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
            hospital: true,
            clinicName: true,
            clinicAddress: true,
            profilePhoto: true,
            phoneNumber: true
          }
        },
        schedule: true
      },
      orderBy: [
        { appointmentDate: 'asc' },  // Earliest date first
        { queueNumber: 'asc' }       // Then by queue number (Q1 before Q2)
      ]
    });

    // Filter out completed appointments that are in the future
    const now = new Date();
    console.log(`🔍 getPatientAppointments: Filtering for patient ${patientId}`);
    console.log(`Current time: ${now.toISOString()}`);
    
    const filteredAppointments = appointments.filter(appointment => {
      // Ensure appointmentDate is a Date object
      const apptDate = appointment.appointmentDate instanceof Date 
        ? appointment.appointmentDate 
        : new Date(appointment.appointmentDate);
      
      const isFuture = apptDate > now;
      const isCompleted = appointment.status === 'completed';
      
      if (isCompleted && isFuture) {
        console.log(`🚫 FILTERED: Appointment ${appointment.id}, Date: ${apptDate.toISOString()}, Status: ${appointment.status}`);
        return false;
      }
      
      if (isCompleted) {
        console.log(`✅ INCLUDED (past): Appointment ${appointment.id}, Date: ${apptDate.toISOString()}`);
      }
      return true;
    });

    // Recalculate booking times based on queue position
    for (const apt of filteredAppointments) {
      if (apt.schedule && apt.queueNumber && apt.schedule.startTime) {
        apt.bookingTime = calculateBookingTime(apt.schedule.startTime, apt.queueNumber);
      }
    }

    console.log(`📊 Returned ${filteredAppointments.length}/${appointments.length} appointments`);

    return res.status(200).json({
      success: true,
      data: filteredAppointments,
      count: filteredAppointments.length
    });

  } catch (error) {
    console.error('Error fetching patient appointments:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get Current Patient's Appointments (using JWT token)
exports.getMyAppointments = async (req, res) => {
  const patientId = req.user.id; // Get from JWT token
  const { status, upcoming } = req.query;

  try {
    const where = { patientId };

    // Return ALL appointments by default (let frontend filter)
    // Only apply status filter if explicitly requested
    if (status) {
      where.status = status;
    }

    if (upcoming === 'true') {
      where.appointmentDate = {
        gte: new Date()
      };
      where.status = {
        in: ['pending', 'confirmed']
      };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      select: {
        id: true,
        patientId: true,
        doctorId: true,
        scheduleId: true,
        appointmentDate: true,
        queueNumber: true,
        status: true,
        bookingTime: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
            hospital: true,
            clinicName: true,
            clinicAddress: true,
            profilePhoto: true,
            phoneNumber: true
          }
        },
        schedule: true
      },
      orderBy: [
        { appointmentDate: 'asc' },  // Earliest date first
        { queueNumber: 'asc' }       // Then by queue number (Q1 before Q2)
      ]
    });

    // Filter out completed appointments that are in the future (show as upcoming, not history)
    const now = new Date();
    console.log(`🔍 getMyAppointments: Fetched ${appointments.length} appointments for patient ${patientId}`);
    console.log(`Current time: ${now.toISOString()}`);
    
    const filteredAppointments = appointments.filter(appointment => {
      // Ensure appointmentDate is a Date object
      const apptDate = appointment.appointmentDate instanceof Date 
        ? appointment.appointmentDate 
        : new Date(appointment.appointmentDate);
      
      const isFuture = apptDate > now;
      const isCompleted = appointment.status === 'completed';
      
      if (isCompleted && isFuture) {
        console.log(`🚫 FILTERED: Appointment ${appointment.id}, Date: ${apptDate.toISOString()}, Status: ${appointment.status}`);
        return false;
      }
      
      return true;
    });

    // Recalculate booking times based on queue position
    for (const apt of filteredAppointments) {
      if (apt.schedule && apt.queueNumber && apt.schedule.startTime) {
        apt.bookingTime = calculateBookingTime(apt.schedule.startTime, apt.queueNumber);
      }
    }

    console.log(`📊 Returned ${filteredAppointments.length}/${appointments.length} appointments (after filtering future completed)`);

    return res.status(200).json({
      success: true,
      appointments: filteredAppointments,
      count: filteredAppointments.length
    });

  } catch (error) {
    console.error('Error fetching my appointments:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get Doctor Appointments
exports.getDoctorAppointments = async (req, res) => {
  const { doctorId } = req.params;
  const { status, date } = req.query;

  try {
    const where = { doctorId };

    if (status) {
      where.status = status;
    }

    if (date) {
      where.appointmentDate = new Date(date);
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            email: true,
            dateOfBirth: true,
            gender: true,
            bloodGroup: true,
            address: true
          }
        },
        schedule: true
      },
      orderBy: [
        { appointmentDate: 'asc' },
        { queueNumber: 'asc' }
      ]
    });

    // Recalculate booking times based on queue position
    for (const apt of appointments) {
      if (apt.schedule && apt.queueNumber && apt.schedule.startTime) {
        apt.bookingTime = calculateBookingTime(apt.schedule.startTime, apt.queueNumber);
      }
    }

    return res.status(200).json({
      success: true,
      appointments: appointments,
      count: appointments.length
    });

  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get Doctor Appointments from authenticated token
exports.getDoctorAppointmentsFromToken = async (req, res) => {
  const doctorId = req.user?.doctorId;
  const { status, date } = req.query;

  if (!doctorId) {
    return res.status(401).json({
      success: false,
      message: 'Doctor authentication required'
    });
  }

  try {
    const where = { doctorId };

    if (status) {
      where.status = status;
    }

    if (date) {
      where.appointmentDate = new Date(date);
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            email: true,
            dateOfBirth: true,
            gender: true,
            bloodGroup: true,
            address: true
          }
        },
        schedule: true
      },
      orderBy: [
        { appointmentDate: 'asc' },
        { queueNumber: 'asc' }
      ]
    });

    // Recalculate booking times based on queue position
    for (const apt of appointments) {
      if (apt.schedule && apt.queueNumber && apt.schedule.startTime) {
        apt.bookingTime = calculateBookingTime(apt.schedule.startTime, apt.queueNumber);
      }
    }

    return res.status(200).json({
      success: true,
      appointments: appointments,
      count: appointments.length
    });

  } catch (error) {
    console.error('Error fetching doctor appointments from token:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update Appointment Status (Doctor)
exports.updateAppointmentStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const validStatuses = ['pending', 'confirmed', 'rejected', 'completed', 'cancelled'];
    
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: { 
        status,
        // Clear queue number for any non-confirmed status to prevent blocking future queue assignments
        ...(status !== 'confirmed' && { queueNumber: null })
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            email: true
          }
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true
          }
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Appointment status updated successfully',
      data: updatedAppointment
    });

  } catch (error) {
    console.error('Error updating appointment status:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Cancel Appointment (Patient or Doctor)
exports.cancelAppointment = async (req, res) => {
  const { id } = req.params;
  const { cancellationReason } = req.body;

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    if (['completed', 'cancelled'].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel appointment with status: ${appointment.status}`
      });
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: { 
        status: 'cancelled',
        queueNumber: null,  // Clear queue number so it doesn't block future appointments
        cancellationReason: cancellationReason || null  // Store cancellation reason if provided
      }
    });

    // Notify the other party based on who cancelled
    const cancelledBy = req.user?.doctorId ? 'doctor' : 'patient';
    if (cancelledBy === 'doctor') {
      // Doctor cancelled → notify patient
      sendNotificationToUser(
        appointment.patientId,
        'Appointment Cancelled',
        `Your appointment on ${new Date(appointment.appointmentDate).toLocaleDateString()} has been cancelled by the doctor.`,
        'appointment'
      ).catch((e) => console.error('[FCM] cancel (by doctor) notify error:', e.message));
    } else {
      // Patient cancelled → notify doctor
      sendNotificationToDoctor(
        appointment.doctorId,
        'Appointment Cancelled',
        `A patient has cancelled their appointment on ${new Date(appointment.appointmentDate).toLocaleDateString()}${cancellationReason ? '. Reason: ' + cancellationReason : ''}.`,
        'appointment'
      ).catch((e) => console.error('[FCM] cancel (by patient) notify error:', e.message));
    }

    return res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: updatedAppointment
    });

  } catch (error) {
    console.error('Error cancelling appointment:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get Queue Status (Real-time queue for a specific date)
exports.getQueueStatus = async (req, res) => {
  const { doctorId, date } = req.query;

  try {
    if (!doctorId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID and date are required'
      });
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: new Date(date),
        status: {
          in: ['confirmed', 'pending']
        }
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phoneNumber: true
          }
        },
        schedule: true
      },
      orderBy: {
        queueNumber: 'asc'
      }
    });

    // Recalculate booking times based on queue position
    for (const apt of appointments) {
      if (apt.schedule && apt.queueNumber && apt.schedule.startTime) {
        apt.bookingTime = calculateBookingTime(apt.schedule.startTime, apt.queueNumber);
      }
    }

    const completedCount = await prisma.appointment.count({
      where: {
        doctorId,
        appointmentDate: new Date(date),
        status: 'completed'
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        date,
        totalInQueue: appointments.length,
        completedToday: completedCount,
        queue: appointments
      }
    });

  } catch (error) {
    console.error('Error fetching queue status:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get Patient's Queue Position
exports.getPatientQueuePosition = async (req, res) => {
  const { appointmentId } = req.params;

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true
          }
        }
      }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Ensure we're comparing dates properly
    const appointmentDateOnly = new Date(appointment.appointmentDate);
    appointmentDateOnly.setHours(0, 0, 0, 0);

    // Count how many appointments are ahead in queue (same day, same doctor, lower queue number)
    const aheadCount = await prisma.appointment.count({
      where: {
        doctorId: appointment.doctorId,
        appointmentDate: appointment.appointmentDate,
        queueNumber: {
          lt: appointment.queueNumber
        },
        status: {
          in: ['pending', 'confirmed']
        }
      }
    });

    // Get currently consulting appointment (status: in-progress or being-consulted)
    const currentlyConsulting = await prisma.appointment.findFirst({
      where: {
        doctorId: appointment.doctorId,
        appointmentDate: appointment.appointmentDate,
        status: {
          in: ['in-progress', 'being-consulted']
        }
      },
      select: {
        queueNumber: true
      }
    });

    // Get next 3 patients in queue
    const nextPatients = await prisma.appointment.findMany({
      where: {
        doctorId: appointment.doctorId,
        appointmentDate: appointment.appointmentDate,
        queueNumber: {
          gt: appointment.queueNumber
        },
        status: {
          in: ['pending', 'confirmed']
        }
      },
      select: {
        queueNumber: true
      },
      orderBy: {
        queueNumber: 'asc'
      },
      take: 3
    });

    return res.status(200).json({
      success: true,
      queueNumber: appointment.queueNumber,
      patientsAhead: aheadCount,
      estimatedWait: aheadCount * 20, // 20 minutes per patient
      currentlyConsulting: currentlyConsulting?.queueNumber || null,
      nextPatients: nextPatients.map(p => p.queueNumber)
    });

  } catch (error) {
    console.error('Error fetching queue position:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// ==================== DOCTOR DASHBOARD ENDPOINTS ====================

// Get All Pending Requests (Doctor side) - Not just today's
exports.getTodayRequests = async (req, res) => {
  try {
    const doctorId = req.user.doctorId; // From JWT token
    
    if (!doctorId) {
      return res.status(401).json({
        success: false,
        message: 'Doctor ID not found in token'
      });
    }

    console.log('🔍 getTodayRequests: Doctor ID =', doctorId);

    // Get ALL pending appointments for this doctor (not just today's)
    // These are requests awaiting doctor confirmation
    const allRequests = await prisma.appointment.findMany({
      where: {
        doctorId,
        status: 'pending'
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            email: true,
            dateOfBirth: true,
            gender: true,
            bloodGroup: true
          }
        },
        schedule: true
      },
      orderBy: [
        { appointmentDate: 'asc' },
        { queueNumber: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    // Recalculate booking times based on queue position
    for (const apt of allRequests) {
      if (apt.schedule && apt.queueNumber && apt.schedule.startTime) {
        apt.bookingTime = calculateBookingTime(apt.schedule.startTime, apt.queueNumber);
      }
    }

    console.log('🔍 getTodayRequests: Found', allRequests.length, 'pending requests (all dates)');

    return res.status(200).json({
      success: true,
      appointments: allRequests,
      count: allRequests.length
    });

  } catch (error) {
    console.error('Error fetching pending requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get Today's Confirmed Bookings (Doctor side)
exports.getTodayBookings = async (req, res) => {
  try {
    const doctorId = req.user.doctorId; // From JWT token
    
    if (!doctorId) {
      return res.status(401).json({
        success: false,
        message: 'Doctor ID not found in token'
      });
    }

    console.log('🔍 getTodayBookings: Doctor ID =', doctorId);

    // Get all CONFIRMED appointments for this doctor (today and future only)
    // Use start of today (midnight) to include today's appointments even if current time is mid-day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log('📅 getTodayBookings: Querying from', today.toISOString());
    
    const allAppointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        status: 'confirmed',
        appointmentDate: {
          gte: today  // Today and future appointments
        }
      },
      select: {
        id: true,
        patientId: true,
        doctorId: true,
        scheduleId: true,
        appointmentDate: true,
        queueNumber: true,
        status: true,
        bookingTime: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        patient: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            email: true,
            dateOfBirth: true,
            gender: true,
            bloodGroup: true
          }
        }
      },
      orderBy: [
        { appointmentDate: 'asc' },
        { queueNumber: 'asc' }
      ]
    });

    console.log('🔍 getTodayBookings: Found', allAppointments.length, 'confirmed appointments (all future dates)');

    // Fetch all schedules for these appointments and recalculate booking times
    // This ensures times reflect actual queue positions
    const scheduleIds = [...new Set(allAppointments.map(apt => apt.scheduleId).filter(Boolean))];
    const schedules = await prisma.doctorSchedule.findMany({
      where: { id: { in: scheduleIds } },
      select: { id: true, startTime: true }
    });

    const scheduleMap = Object.fromEntries(schedules.map(s => [s.id, s.startTime]));

    // Recalculate booking times based on queue position
    for (const apt of allAppointments) {
      if (apt.scheduleId && apt.queueNumber && scheduleMap[apt.scheduleId]) {
        apt.bookingTime = calculateBookingTime(scheduleMap[apt.scheduleId], apt.queueNumber);
        console.log(`⏰ Recalculated ${apt.patient?.name} (Queue #${apt.queueNumber}): ${apt.bookingTime}`);
      }
    }

    return res.status(200).json({
      success: true,
      appointments: allAppointments,
      count: allAppointments.length
    });

  } catch (error) {
    console.error('Error fetching bookings:', error);
    console.error('Doctor ID:', req.user?.doctorId);
    console.error('Today:', new Date().toISOString());
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get Doctor's Live Queue
exports.getDoctorQueue = async (req, res) => {
  try {
    const doctorId = req.user.doctorId; // From JWT token
    
    console.log('🏥 getDoctorQueue - Authenticated doctorId:', doctorId);
    
    if (!doctorId) {
      return res.status(401).json({
        success: false,
        message: 'Doctor ID not found in token'
      });
    }

    // Get date from query parameter or use today
    let targetDateStr = '';
    
    if (req.query.date) {
      targetDateStr = req.query.date; // Format: YYYY-MM-DD
      console.log('📅 Query date parameter:', targetDateStr);
    } else {
      // Get today's date in YYYY-MM-DD format
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      targetDateStr = `${year}-${month}-${day}`;
      console.log('📅 Using today date:', targetDateStr);
    }

    // Query using raw SQL for proper date comparison
    // This avoids timezone issues by comparing dates directly
    const queueAppointments = await prisma.$queryRaw`
      SELECT 
        a.*,
        json_build_object(
          'id', p.id,
          'name', p.name,
          'phoneNumber', p."phoneNumber"
        ) as patient
      FROM appointments a
      JOIN users p ON a."patientId" = p.id
      WHERE a."doctorId" = ${doctorId}
        AND a."appointmentDate"::date = ${targetDateStr}::date
        AND a.status IN ('pending', 'confirmed')
      ORDER BY a."queueNumber" ASC
    `;
    
    console.log('🔍 Found', queueAppointments.length, 'appointments for doctorId:', doctorId);
    if (queueAppointments.length > 0) {
      console.log('👤 First patient:', queueAppointments[0].patient?.name);
    }

    // Fetch all schedules for these appointments at once (optimization)
    const scheduleIds = [...new Set(queueAppointments.map(apt => apt.scheduleId).filter(Boolean))];
    const schedules = await prisma.doctorSchedule.findMany({
      where: { id: { in: scheduleIds } },
      select: { id: true, startTime: true }
    });

    const scheduleMap = Object.fromEntries(schedules.map(s => [s.id, s.startTime]));

    // Recalculate booking times based on queue position and schedule
    // This ensures times are correct even if appointments were booked before the queue fix
    for (const apt of queueAppointments) {
      if (apt.scheduleId && apt.queueNumber && scheduleMap[apt.scheduleId]) {
        // Recalculate booking time based on queue position
        apt.bookingTime = calculateBookingTime(scheduleMap[apt.scheduleId], apt.queueNumber);
        console.log(`⏰ Recalculated ${apt.patient?.name} (Queue #${apt.queueNumber}): ${apt.bookingTime}`);
      }
    }

    // Get completed appointments for today (for stats)
    const completedToday = await prisma.appointment.count({
      where: {
        doctorId,
        appointmentDate: new Date(targetDateStr),
        status: 'completed'
      }
    });

    // Split into current patient (first confirmed) and waiting patients (rest)
    const currentPatient = queueAppointments.length > 0 ? queueAppointments[0] : null;
    const waitingPatients = queueAppointments.slice(1);

    return res.status(200).json({
      success: true,
      currentPatient,
      waitingPatients,
      allAppointments: queueAppointments,
      totalCount: queueAppointments.length,
      completedToday
    });

  } catch (error) {
    console.error('Error fetching doctor queue:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Accept Appointment Request (Doctor)
/**
 * HELPER: Convert HH:mm format to total minutes
 * @param {string} timeStr - Time in "HH:mm" format (e.g., "10:30")
 * @returns {number} Total minutes since midnight
 */
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * HELPER: Convert minutes to HH:mm AM/PM format
 * @param {number} totalMinutes - Total minutes since midnight
 * @returns {string} Time in "hh:mm AM/PM" format
 */
function minutesToTimeString(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);

  return `${String(displayHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
}

/**
 * HELPER: Add minutes to a time string in AM/PM format
 * @param {string} timeStr - Time in "hh:mm AM/PM" format (e.g., "12:40 PM")
 * @param {number} minutesToAdd - Number of minutes to add
 * @returns {string} New time in "hh:mm AM/PM" format
 */
function addMinutesToTimeString(timeStr, minutesToAdd = 20) {
  // Parse the AM/PM time format
  const parts = timeStr.trim().split(' ');
  const timePart = parts[0]; // "12:40"
  const period = parts[1]?.toUpperCase() || 'AM'; // "PM"
  
  const [hourStr, minStr] = timePart.split(':');
  let hour = parseInt(hourStr);
  let minute = parseInt(minStr);
  
  // Convert to 24-hour format
  if (period === 'PM' && hour !== 12) {
    hour += 12;
  } else if (period === 'AM' && hour === 12) {
    hour = 0;
  }
  
  // Convert to total minutes and add
  let totalMinutes = hour * 60 + minute + minutesToAdd;
  
  // Handle day overflow (if goes past midnight, wrap to next day or just keep adding)
  // For simplicity, allow going past 24 hours for same-day calculations
  
  return minutesToTimeString(totalMinutes);
}

/**
 * HELPER: Calculate booking time based on queue position
 * @param {string} scheduleStartTime - Schedule start time in "HH:mm" format
 * @param {number} queueNumber - Queue position (1-indexed)
 * @param {number} slotDuration - Slot duration in minutes
 * @returns {string} Booking time in "hh:mm AM/PM" format
 */
function calculateBookingTime(scheduleStartTime, queueNumber, slotDuration = 20) {
  const startMinutes = timeToMinutes(scheduleStartTime);
  const bookingMinutes = startMinutes + (queueNumber - 1) * slotDuration;
  return minutesToTimeString(bookingMinutes);
}

exports.acceptAppointment = async (req, res) => {
  const { id } = req.params;
  const { scheduleId } = req.body;

  try {
    const doctorId = req.user.doctorId;

    // ========== VALIDATION ==========
    if (!scheduleId) {
      return res.status(400).json({
        success: false,
        message: 'scheduleId is required in request body'
      });
    }

    // ========== WRAPPED IN TRANSACTION ==========
    // Ensures no race conditions with concurrent requests
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch appointment by ID
      const appointment = await tx.appointment.findUnique({
        where: { id },
        include: {
          schedule: true,
          patient: {
            select: {
              id: true,
              name: true,
              phoneNumber: true,
              email: true
            }
          }
        }
      });

      if (!appointment) {
        throw new Error('APPOINTMENT_NOT_FOUND');
      }

      // Verify doctor ownership
      if (appointment.doctorId !== doctorId) {
        throw new Error('NOT_AUTHORIZED');
      }

      // Verify appointment status is pending
      if (appointment.status !== 'pending') {
        throw new Error('INVALID_STATUS');
      }

      // 2. Fetch schedule using scheduleId
      const schedule = await tx.doctorSchedule.findUnique({
        where: { id: scheduleId }
      });

      if (!schedule) {
        throw new Error('SCHEDULE_NOT_FOUND');
      }

      // 3. Validate schedule belongs to same doctor
      if (schedule.doctorId !== appointment.doctorId) {
        throw new Error('SCHEDULE_MISMATCH');
      }

      // 3.5. Validate appointment has queue number from booking
      if (appointment.queueNumber === null) {
        throw new Error('NO_QUEUE_ASSIGNED');
      }

      // 4. Get booking time already calculated during booking
      // No need to recalculate - it was set when appointment was created
      const bookingTime = appointment.bookingTime;

      // 5. Check if session is full (validate against max patients)
      const confirmedCount = await tx.appointment.count({
        where: {
          doctorId: appointment.doctorId,
          appointmentDate: appointment.appointmentDate,
          scheduleId: scheduleId,
          status: 'confirmed'
        }
      });

      if ((confirmedCount + 1) > schedule.maxPatients) {
        throw new Error('SESSION_FULL');
      }

      // 6. Update appointment to confirmed status - KEEP THE SAME QUEUE NUMBER AND BOOKING TIME
      const updatedAppointment = await tx.appointment.update({
        where: { id },
        data: {
          scheduleId: scheduleId,
          status: 'confirmed'
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              phoneNumber: true,
              email: true
            }
          },
          schedule: true,
          doctor: {
            select: {
              id: true,
              name: true,
              specialization: true,
              hospital: true
            }
          }
        }
      });

      return updatedAppointment;
    }, {
      timeout: 10000 // 10 second timeout
    });

    // 10. Send notification after transaction succeeds
    sendNotificationToUser(
      result.patientId,
      'Appointment Confirmed',
      `Your appointment with Dr. ${result.doctor.name} has been confirmed for ${new Date(result.appointmentDate).toLocaleDateString()} at ${result.bookingTime}. Queue Number: ${result.queueNumber}`,
      'appointment'
    ).catch((e) => console.error('[FCM] accept notify error:', e.message));

    return res.status(200).json({
      success: true,
      message: 'Appointment accepted successfully',
      data: {
        ...result,
        queueInfo: {
          queueNumber: result.queueNumber,
          totalSlots: result.schedule.maxPatients,
          bookingTime: result.bookingTime,
          appointmentDate: result.appointmentDate
        }
      }
    });

  } catch (error) {
    console.error('Error accepting appointment:', error);

    // Handle specific errors
    if (error.message === 'APPOINTMENT_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    if (error.message === 'NOT_AUTHORIZED') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to accept this appointment'
      });
    }

    if (error.message === 'INVALID_STATUS') {
      return res.status(400).json({
        success: false,
        message: 'Cannot accept appointment that is not pending'
      });
    }

    if (error.message === 'SCHEDULE_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    if (error.message === 'SCHEDULE_MISMATCH') {
      return res.status(400).json({
        success: false,
        message: 'Schedule does not belong to this doctor'
      });
    }

    if (error.message === 'SESSION_FULL') {
      return res.status(400).json({
        success: false,
        message: 'Session is full. No more appointments can be accepted for this time slot.'
      });
    }

    // Unique constraint violation (e.g., duplicate queue number in concurrent requests)
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Queue conflict detected. This queue position was assigned in another request. Please retry.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Reject Appointment Request (Doctor)
exports.rejectAppointment = async (req, res) => {
  const { id } = req.params;
  
  try {
    const doctorId = req.user.doctorId;

    const appointment = await prisma.appointment.findUnique({
      where: { id }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    if (appointment.doctorId !== doctorId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this appointment'
      });
    }

    if (appointment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject appointment with status: ${appointment.status}`
      });
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: { 
        status: 'rejected',
        queueNumber: null  // Clear queue number since rejected appointments are no longer in queue
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phoneNumber: true
          }
        }
      }
    });

    // Notify the patient that their appointment was rejected
    sendNotificationToUser(
      updatedAppointment.patientId,
      'Appointment Declined',
      `Your appointment request for ${new Date(updatedAppointment.appointmentDate).toLocaleDateString()} was declined by the doctor.`,
      'appointment'
    ).catch((e) => console.error('[FCM] reject notify error:', e.message));

    return res.status(200).json({
      success: true,
      message: 'Appointment rejected successfully',
      appointment: updatedAppointment
    });

  } catch (error) {
    console.error('Error rejecting appointment:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Complete Appointment (Doctor)
exports.completeAppointment = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Only doctors can complete appointments
    if (req.user.role !== 'doctor' || !req.user.doctorId) {
      return res.status(403).json({
        success: false,
        message: 'Only doctors can complete appointments'
      });
    }

    const doctorId = req.user.doctorId;

    const appointment = await prisma.appointment.findUnique({
      where: { id }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    if (appointment.doctorId !== doctorId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this appointment'
      });
    }

    if (appointment.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: `Cannot complete appointment with status: ${appointment.status}`
      });
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: { 
        status: 'completed',
        queueNumber: null  // Clear queue number so it doesn't block future appointments
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phoneNumber: true
          }
        }
      }
    });

    // Notify the patient that their appointment is completed
    sendNotificationToUser(
      updatedAppointment.patientId,
      'Appointment Completed',
      `Your appointment on ${new Date(updatedAppointment.appointmentDate).toLocaleDateString()} has been marked as completed.`,
      'appointment'
    ).catch((e) => console.error('[FCM] complete notify error:', e.message));

    return res.status(200).json({
      success: true,
      message: 'Appointment completed successfully',
      appointment: updatedAppointment
    });

  } catch (error) {
    console.error('Error completing appointment:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
