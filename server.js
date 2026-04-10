require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

function getCorsOrigins() {
  const rawOrigins = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '';
  return rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const allowedOrigins = getCorsOrigins();
const corsOptions = {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

if (allowedOrigins.length === 0) {
  // Development fallback when no explicit origins are configured.
  corsOptions.origin = true;
} else {
  corsOptions.origin = (origin, callback) => {
    // Allow non-browser clients (curl/postman) that do not send Origin.
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('CORS origin not allowed'));
  };
}

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/reports', require('./routes/reportRoutes')); // Category-based parameter extraction
app.use('/api/extraction', require('./routes/extractionRoutes')); // Schema-based extraction
app.use('/api/health', require('./routes/healthRoutes'));
app.use('/api/history', require('./routes/historyRoutes'));
app.use('/api/test-definitions', require('./routes/testDefinitionRoutes'));
app.use('/api/ocr', require('./routes/ocrRoutes')); // OCR text extraction

// Appointment System Routes
app.use('/api/doctor/auth', require('./routes/doctorAuthRoutes')); // Doctor authentication
app.use('/api/doctors', require('./routes/doctorRoutes')); // Doctor management
app.use('/api/schedules', require('./routes/scheduleRoutes')); // Doctor schedules
app.use('/api/appointments', require('./routes/appointmentRoutes')); // Appointments & Queue

// Notification System Routes
app.use('/api/notifications', require('./routes/notificationRoutes')); // Push notifications

// Health check
app.get('/api/health-check', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'MedTrack Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// Favicon handler (prevent 404 errors)
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: '🏥 MedTrack Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health-check',
      auth: '/api/auth',
      reports: '/api/reports',
      extraction: '/api/extraction',
      health_analysis: '/api/health',
      history: '/api/history',
      ocr: '/api/ocr',
      doctor_auth: '/api/doctor/auth',
      doctors: '/api/doctors',
      schedules: '/api/schedules',
      appointments: '/api/appointments'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler middleware (must be last)
app.use(errorHandler);

// ===== APPOINTMENT START TIME NOTIFICATION SCHEDULER =====
// Check for appointments starting and send notifications to doctor & patient
const prisma = require('./config/database');
const { sendNotificationToUser, sendNotificationToDoctor } = require('./services/pushNotificationService');

async function checkAndSendAppointmentStartNotifications() {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 100 + currentMinute; // e.g., 1630 for 4:30 PM
    
    // Find confirmed appointments for today that haven't been notified yet
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const appointmentsStarting = await prisma.appointment.findMany({
      where: {
        status: 'confirmed',
        appointmentStartNotificationSent: false,
        appointmentDate: {
          gte: todayStart,
          lt: tomorrowStart
        }
      },
      select: {
        id: true,
        appointmentDate: true,
        bookingTime: true,  // e.g., "04:30 PM" or "4:30 PM"
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true } }
      }
    });

    for (const appointment of appointmentsStarting) {
      try {
        // Parse booking time (e.g., "04:30 PM" or "4:30 PM")
        const timeStr = appointment.bookingTime || '';
        const timeParts = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        
        if (!timeParts) {
          console.warn(`⚠️  Could not parse booking time "${appointment.bookingTime}" for appointment ${appointment.id}`);
          continue;
        }
        
        let hours = parseInt(timeParts[1], 10);
        const minutes = parseInt(timeParts[2], 10);
        const meridiem = timeParts[3].toUpperCase();
        
        // Convert to 24-hour format
        if (meridiem === 'PM' && hours !== 12) {
          hours += 12;
        } else if (meridiem === 'AM' && hours === 12) {
          hours = 0;
        }
        
        const appointmentTimeValue = hours * 100 + minutes;
        
        // Send notification if current time >= appointment start time (within a 5-minute grace period)
        // Grace period: start from 5 minutes before appointment time
        const gracePeriodTime = appointmentTimeValue - 5; // 5 minutes before
        
        if (currentTime >= gracePeriodTime && currentTime < appointmentTimeValue + 100) {
          // Send notification to patient
          await sendNotificationToUser(
            appointment.patient.id,
            '🏥 Your Appointment is Starting',
            `Your appointment with Dr. ${appointment.doctor.name} is starting now!`,
            'appointment_started'
          );

          // Send notification to doctor
          await sendNotificationToDoctor(
            appointment.doctor.id,
            '📍 Appointment Starting',
            `${appointment.patient.name}'s appointment is starting now!`,
            'appointment_started'
          );

          // Mark this appointment as notified
          await prisma.appointment.update({
            where: { id: appointment.id },
            data: { appointmentStartNotificationSent: true }
          });

          console.log(`✅ Sent appointment start notification for: ${appointment.patient.name} with Dr. ${appointment.doctor.name} at ${appointment.bookingTime}`);
        } else {
          console.log(`⏱️  Appointment ${appointment.id} for ${appointment.patient.name} starts at ${appointment.bookingTime} (current time: ${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')})`);
        }
      } catch (appointmentError) {
        console.error(`❌ Error processing appointment ${appointment.id}:`, appointmentError.message);
      }
    }
  } catch (error) {
    console.error('❌ Error checking appointment start notifications:', error.message);
  }
}

// Run the scheduler every minute
setInterval(checkAndSendAppointmentStartNotifications, 60000);
console.log('⏰ Appointment notification scheduler started (checks every minute)');

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all network interfaces

// Get local network IP
function getLocalNetworkIP() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalNetworkIP();

app.listen(PORT, HOST, () => {
  console.log('\n🚀 MedTrack Backend Server Started!');
  console.log('═'.repeat(50));
  console.log(`📅 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Local: http://localhost:${PORT}/api`);
  console.log(`🌐 Network: http://${localIP}:${PORT}/api`);
  console.log('═'.repeat(50));
  console.log('\n📱 Flutter App Configuration:');
  console.log(`   
   1. USB Connection (Recommended):
      - Run: adb reverse tcp:${PORT} tcp:${PORT}
      - .env: API_BASE_URL=http://localhost:${PORT}/api
   
   2. WiFi Connection:
      - .env: API_BASE_URL=http://${localIP}:${PORT}/api
      - Ensure phone and PC on same network
   
   3. Emulator:
      - .env: API_BASE_URL=http://10.0.2.2:${PORT}/api
  `);
  console.log('═'.repeat(50));
  console.log(`\n✅ Server ready to accept OCR requests\n`);
});

module.exports = app;
