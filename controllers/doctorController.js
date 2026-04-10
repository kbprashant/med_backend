const prisma = require('../config/database');

// Get Doctor by ID
exports.getDoctor = async (req, res) => {
  const { id } = req.params;

  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: {
        schedules: {
          orderBy: {
            dayOfWeek: 'asc'
          }
        },
        appointments: {
          where: {
            status: {
              in: ['pending', 'confirmed']
            }
          },
          include: {
            patient: {
              select: {
                id: true,
                name: true,
                phoneNumber: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Remove password hash from response
    const { passwordHash, ...doctorData } = doctor;

    return res.status(200).json({
      success: true,
      data: doctorData
    });

  } catch (error) {
    console.error('Error fetching doctor:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get All Doctors
exports.getAllDoctors = async (req, res) => {
  const { specialization, hospital, search } = req.query;

  try {
    const where = {};

    if (specialization) {
      where.specialization = specialization;
    }

    if (hospital) {
      where.hospital = hospital;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { specialization: { contains: search, mode: 'insensitive' } },
        { hospital: { contains: search, mode: 'insensitive' } }
      ];
    }

    const doctors = await prisma.doctor.findMany({
      where,
      include: {
        schedules: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Remove password hashes
    const sanitizedDoctors = doctors.map(doctor => {
      const { passwordHash, ...doctorData } = doctor;
      return doctorData;
    });

    return res.status(200).json({
      success: true,
      data: sanitizedDoctors,
      count: sanitizedDoctors.length
    });

  } catch (error) {
    console.error('Error fetching doctors:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update Doctor Profile
exports.updateDoctor = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    phoneNumber,
    specialization,
    hospital,
    clinicName,
    clinicAddress,
    profilePhoto
  } = req.body;

  try {
    // Check if doctor exists
    const existingDoctor = await prisma.doctor.findUnique({
      where: { id }
    });

    if (!existingDoctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Check if updating phone number and it's already taken
    if (phoneNumber && phoneNumber !== existingDoctor.phoneNumber) {
      const phoneExists = await prisma.doctor.findFirst({
        where: {
          phoneNumber,
          id: { not: id }
        }
      });

      if (phoneExists) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already in use'
        });
      }
    }

    // Update doctor
    const updatedDoctor = await prisma.doctor.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phoneNumber && { phoneNumber }),
        ...(specialization && { specialization }),
        ...(hospital && { hospital }),
        ...(clinicName && { clinicName }),
        ...(clinicAddress && { clinicAddress }),
        ...(profilePhoto !== undefined && { profilePhoto })
      }
    });

    const { passwordHash, ...doctorData } = updatedDoctor;

    return res.status(200).json({
      success: true,
      message: 'Doctor profile updated successfully',
      data: doctorData
    });

  } catch (error) {
    console.error('Error updating doctor:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete Doctor
exports.deleteDoctor = async (req, res) => {
  const { id } = req.params;

  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id }
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    await prisma.doctor.delete({
      where: { id }
    });

    return res.status(200).json({
      success: true,
      message: 'Doctor deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting doctor:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get All Unique Specializations
exports.getSpecializations = async (req, res) => {
  try {
    const doctors = await prisma.doctor.findMany({
      select: {
        specialization: true
      },
      distinct: ['specialization']
    });

    const specializations = doctors
      .map(doctor => doctor.specialization)
      .filter(spec => spec !== null && spec !== undefined && spec !== '')
      .sort();

    return res.status(200).json({
      success: true,
      specializations: specializations,
      count: specializations.length
    });

  } catch (error) {
    console.error('Error fetching specializations:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get Doctors By Specialization
exports.getDoctorsBySpecialization = async (req, res) => {
  const { specialization } = req.params;

  try {
    const doctors = await prisma.doctor.findMany({
      where: {
        specialization: {
          equals: specialization,
          mode: 'insensitive' // Case-insensitive search
        }
      },
      include: {
        schedules: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Remove password hashes
    const sanitizedDoctors = doctors.map(doctor => {
      const { passwordHash, ...doctorData } = doctor;
      return doctorData;
    });

    return res.status(200).json({
      success: true,
      doctors: sanitizedDoctors,
      count: sanitizedDoctors.length
    });

  } catch (error) {
    console.error('Error fetching doctors by specialization:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
