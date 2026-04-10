const prisma = require('../config/database');
const emailService = require('../services/emailService');
const { sendNotificationToUser } = require('../services/pushNotificationService');

// Create Doctor Schedule
exports.createSchedule = async (req, res) => {
  // Extract doctorId from authenticated user's token
  const doctorId = req.user?.doctorId;
  const { dayOfWeek, startTime, endTime, maxPatients, availability } = req.body;

  try {
    // Validation
    if (!doctorId) {
      return res.status(401).json({
        success: false,
        message: 'Doctor authentication required'
      });
    }

    if (!dayOfWeek || !startTime || !endTime || !maxPatients) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (!validDays.includes(dayOfWeek)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid day of week'
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

    // Check if schedule already exists for this exact day/time slot
    const existingSchedule = await prisma.doctorSchedule.findFirst({
      where: {
        doctorId,
        dayOfWeek,
        startTime,
        endTime
      }
    });

    let schedule;
    if (existingSchedule) {
      // Update existing schedule
      schedule = await prisma.doctorSchedule.update({
        where: { id: existingSchedule.id },
        data: {
          startTime,
          endTime,
          maxPatients: parseInt(maxPatients),
          ...(availability && { availability })
        },
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
    } else {
      // Create new schedule
      schedule = await prisma.doctorSchedule.create({
        data: {
          doctorId,
          dayOfWeek,
          startTime,
          endTime,
          maxPatients: parseInt(maxPatients),
          ...(availability && { availability })
        },
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
    }

    return res.status(201).json({
      success: true,
      message: 'Schedule created successfully',
      schedule: schedule
    });

  } catch (error) {
    console.error('Error creating schedule:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get All Schedules for a Doctor
exports.getDoctorSchedules = async (req, res) => {
  const { doctorId } = req.params;

  try {
    const schedules = await prisma.doctorSchedule.findMany({
      where: { doctorId: doctorId },
      orderBy: {
        dayOfWeek: 'asc'
      }
    });

    return res.status(200).json({
      success: true,
      schedules: schedules
    });

  } catch (error) {
    console.error('Error fetching schedules:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get Schedules for Authenticated Doctor (from JWT token)
exports.getMySchedules = async (req, res) => {
  const doctorId = req.user?.doctorId;

  try {
    if (!doctorId) {
      return res.status(401).json({
        success: false,
        message: 'Doctor authentication required'
      });
    }

    const schedules = await prisma.doctorSchedule.findMany({
      where: { doctorId },
      orderBy: {
        dayOfWeek: 'asc'
      }
    });

    return res.status(200).json({
      success: true,
      schedules: schedules
    });

  } catch (error) {
    console.error('Error fetching my schedules:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get Schedule by ID
exports.getSchedule = async (req, res) => {
  const { id } = req.params;

  try {
    const schedule = await prisma.doctorSchedule.findUnique({
      where: { id },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
            clinicName: true
          }
        }
      }
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: schedule
    });

  } catch (error) {
    console.error('Error fetching schedule:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update Schedule
exports.updateSchedule = async (req, res) => {
  const { id } = req.params;
  const { dayOfWeek, startTime, endTime, maxPatients, availability } = req.body;

  try {
    const existingSchedule = await prisma.doctorSchedule.findUnique({
      where: { id },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!existingSchedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Validate day if provided
    if (dayOfWeek) {
      const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      if (!validDays.includes(dayOfWeek)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid day of week'
        });
      }
    }

    // Validate availability status if provided
    if (availability) {
      const validAvailability = ['available', 'unavailable', 'doubtful'];
      if (!validAvailability.includes(availability)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid availability status'
        });
      }
    }

    // Validate maxPatients against existing confirmed appointments
    if (maxPatients) {
      const maxPatientsNum = parseInt(maxPatients);
      const confirmedAppointmentsCount = await prisma.appointment.count({
        where: {
          scheduleId: id,
          status: 'confirmed'
        }
      });
      if (confirmedAppointmentsCount > maxPatientsNum) {
        return res.status(400).json({
          success: false,
          message: `Cannot reduce max patients to ${maxPatientsNum}. There are ${confirmedAppointmentsCount} confirmed appointments.`
        });
      }
    }

    const previousAvailability = existingSchedule.availability;
    const previousStartTime = existingSchedule.startTime;
    const previousEndTime = existingSchedule.endTime;

    // ========== WRAPPED IN TRANSACTION ==========
    // Ensures schedule and appointment updates are atomic
    const result = await prisma.$transaction(async (tx) => {
      // Update the schedule
      const updatedSchedule = await tx.doctorSchedule.update({
        where: { id },
        data: {
          ...(dayOfWeek && { dayOfWeek }),
          ...(startTime && { startTime }),
          ...(endTime && { endTime }),
          ...(maxPatients && { maxPatients: parseInt(maxPatients) }),
          ...(availability && { availability })
        }
      });

      // If time changed, recalculate booking times for all confirmed appointments
      if ((startTime && startTime !== previousStartTime) || (endTime && endTime !== previousEndTime)) {
        const affectedAppointments = await tx.appointment.findMany({
          where: {
            scheduleId: id,
            status: 'confirmed',
            appointmentDate: {
              gte: new Date()
            }
          }
        });

        // Recalculate booking times for future appointments
        for (const appointment of affectedAppointments) {
          if (appointment.queueNumber) {
            const newBookingTime = calculateBookingTime(
              startTime || previousStartTime,
              appointment.queueNumber
            );
            await tx.appointment.update({
              where: { id: appointment.id },
              data: { bookingTime: newBookingTime }
            });
          }
        }
      }

      return updatedSchedule;
    }, {
      timeout: 10000
    })

    // Notify affected patients of changes
    let notifiedPatientsCount = 0;
    let notificationReason = '';

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const affectedAppointments = await prisma.appointment.findMany({
      where: {
        scheduleId: id,
        status: 'confirmed',
        appointmentDate: {
          gte: todayStart,
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Determine notification reason
    if (availability && ['unavailable', 'doubtful'].includes(availability) && previousAvailability !== availability) {
      notificationReason = `Your appointment has been affected because the doctor is now ${availability}.`;
    } else if ((startTime && startTime !== previousStartTime) || (endTime && endTime !== previousEndTime)) {
      notificationReason = `Your appointment booking time has been updated due to schedule changes. Please check your appointment details.`;
    }

    if (notificationReason && affectedAppointments.length > 0) {

      const notificationTitle = 'Appointment Schedule Updated';
      const doctorName = existingSchedule.doctor?.name || 'your doctor';
      const notificationMessage = `Your appointment with Dr. ${doctorName} has been updated. ${notificationReason}`;

      const notificationTasks = affectedAppointments
        .filter((appointment) => appointment.patient?.email)
        .map((appointment) => {
          const tasks = [
            emailService.sendEmail({
              to: appointment.patient.email,
              subject: notificationTitle,
              html: `<p>${notificationMessage}</p>`,
            }),
          ];
          // Also send FCM push notification to patient
          if (appointment.patientId) {
            tasks.push(
              sendNotificationToUser(
                appointment.patientId,
                notificationTitle,
                notificationMessage,
                'appointment'
              )
            );
          }
          return Promise.allSettled(tasks);
        });

      const notificationResults = await Promise.allSettled(notificationTasks);
      notifiedPatientsCount = notificationResults.filter(
        (result) => result.status === 'fulfilled'
      ).length;
    }

    const updatedSchedule = result;

    return res.status(200).json({
      success: true,
      message: 'Schedule updated successfully',
      data: updatedSchedule,
      notifiedPatientsCount,
    });

  } catch (error) {
    console.error('Error updating schedule:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete Schedule
exports.deleteSchedule = async (req, res) => {
  const { id } = req.params;

  try {
    const schedule = await prisma.doctorSchedule.findUnique({
      where: { id },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // ========== WRAPPED IN TRANSACTION ==========
    // Ensures schedule deletion and appointment handling are atomic
    const result = await prisma.$transaction(async (tx) => {
      // Find all appointments using this schedule
      const affectedAppointments = await tx.appointment.findMany({
        where: {
          scheduleId: id
        },
        include: {
          patient: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      // Delete the schedule (cascades will handle appointments with SetNull)
      const deletedSchedule = await tx.doctorSchedule.delete({
        where: { id }
      });

      return {
        deletedSchedule,
        affectedAppointments,
      };
    }, {
      timeout: 10000
    });

    // Notify affected patients about schedule deletion
    const { affectedAppointments, deletedSchedule } = result;

    // Only notify patients with CONFIRMED appointments
    const confirmedAppointments = affectedAppointments.filter(
      (appointment) => appointment.status === 'confirmed'
    );

    if (confirmedAppointments.length > 0) {
      const notificationTitle = 'Doctor Schedule Cancelled';
      const doctorName = schedule.doctor?.name || 'your doctor';
      const notificationMessage = `Your appointment with Dr. ${doctorName} has been cancelled because the doctor's schedule was deleted. Please book a new appointment.`;

      const notificationTasks = confirmedAppointments
        .filter((appointment) => appointment.patient?.email)
        .map((appointment) => {
          const tasks = [
            emailService.sendEmail({
              to: appointment.patient.email,
              subject: notificationTitle,
              html: `<p>${notificationMessage}</p>`,
            }),
          ];
          // Also send FCM push notification to patient
          if (appointment.patientId) {
            tasks.push(
              sendNotificationToUser(
                appointment.patientId,
                notificationTitle,
                notificationMessage,
                'appointment'
              )
            );
          }
          return Promise.allSettled(tasks);
        });

      await Promise.allSettled(notificationTasks);
    }

    return res.status(200).json({
      success: true,
      message: 'Schedule deleted successfully',
      affectedAppointmentsCount: affectedAppointments.length
    });

  } catch (error) {
    console.error('Error deleting schedule:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Generate Time Slots (20-minute intervals)
exports.getAvailableTimeSlots = async (req, res) => {
  const { scheduleId, date } = req.query;

  try {
    if (!scheduleId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Schedule ID and date are required'
      });
    }

    const schedule = await prisma.doctorSchedule.findUnique({
      where: { id: scheduleId }
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Get existing appointments for this date
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        scheduleId,
        appointmentDate: new Date(date),
        status: {
          in: ['pending', 'confirmed']
        }
      }
    });

    const bookedSlots = existingAppointments.map(apt => apt.bookingTime);

    // Generate time slots
    const slots = generateTimeSlots(schedule.startTime, schedule.endTime, 20);

    // Mark slots as available or booked
    const availableSlots = slots.map(slot => ({
      time: slot,
      available: !bookedSlots.includes(slot)
    }));

    return res.status(200).json({
      success: true,
      data: {
        schedule: {
          id: schedule.id,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          maxPatients: schedule.maxPatients
        },
        date,
        slots: availableSlots,
        totalSlots: slots.length,
        availableCount: availableSlots.filter(s => s.available).length,
        bookedCount: bookedSlots.length
      }
    });

  } catch (error) {
    console.error('Error generating time slots:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Helper function to generate time slots
function generateTimeSlots(startTime, endTime, intervalMinutes) {
  const slots = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let currentHour = startHour;
  let currentMin = startMin;

  while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
    const hour12 = currentHour > 12 ? currentHour - 12 : (currentHour === 0 ? 12 : currentHour);
    const period = currentHour >= 12 ? 'PM' : 'AM';
    const timeStr = `${String(hour12).padStart(2, '0')}:${String(currentMin).padStart(2, '0')} ${period}`;
    slots.push(timeStr);

    currentMin += intervalMinutes;
    if (currentMin >= 60) {
      currentMin -= 60;
      currentHour += 1;
    }
  }

  return slots;
}
