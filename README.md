# 🏥 MedTrack Backend API

Complete backend system for MedTrack healthcare mobile application built with Node.js, Express, PostgreSQL, and Prisma ORM.

## 📋 Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Running the Server](#running-the-server)
- [API Documentation](#api-documentation)
- [Security Features](#security-features)

---

## ✨ Features

### 🔐 Authentication System
- User registration with email OTP verification
- Login with phone number + password
- JWT-based authentication
- Forgot password with OTP
- Password reset functionality
- Resend OTP (max 5 attempts)
- Email notifications for all auth events

### 📄 Report Management
- Upload medical reports with OCR text
- Store multiple test results per report
- Automatic status detection (NORMAL/HIGH/LOW)
- Filter reports by test type
- Delete reports

### 🧠 Health Analysis
- AI-powered health summary generation
- Pattern matching for common tests
- Reference range validation
- Parameter trend analysis
- Test type insights
- Critical issue detection

### 📊 History & Analytics
- Full report history with filters
- Graph data for parameter trends
- Monthly/yearly summaries
- Report comparison
- Statistics dashboard

### 📧 Email Notifications
- OTP verification emails
- Registration success emails
- Password change alerts
- Health notifications

---

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcrypt
- **Email Service:** Nodemailer (Gmail SMTP)
- **Validation:** express-validator
- **Environment Variables:** dotenv

---

## 📁 Project Structure

```
med_backend/
├── config/
│   ├── database.js        # Prisma client & DB connection
│   ├── email.js           # Nodemailer configuration
│   └── auth.js            # JWT & OTP config
├── controllers/
│   ├── authController.js      # Auth endpoints logic
│   ├── reportController.js    # Report CRUD operations
│   ├── healthController.js    # Health analysis logic
│   └── historyController.js   # History & graph data
├── middleware/
│   ├── authenticate.js    # JWT verification middleware
│   ├── errorHandler.js    # Global error handler
│   └── validator.js       # Request validation rules
├── models/
│   └── (Prisma schema handles models)
├── routes/
│   ├── authRoutes.js      # Auth API routes
│   ├── reportRoutes.js    # Report API routes
│   ├── healthRoutes.js    # Health API routes
│   └── historyRoutes.js   # History API routes
├── services/
│   ├── emailService.js         # Email sending logic
│   ├── otpService.js           # OTP generation & verification
│   ├── jwtService.js           # JWT token management
│   └── healthAnalysisService.js # Health analysis algorithms
├── utils/
│   ├── dateUtils.js       # Date formatting helpers
│   ├── responseUtils.js   # API response helpers
│   └── validators.js      # Custom validators
├── prisma/
│   └── schema.prisma      # Database schema
├── .env.example           # Environment variables template
├── .gitignore
├── package.json
├── server.js              # Main entry point
└── README.md
```

---

## 🚀 Installation

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- Gmail account (for SMTP)

### Step 1: Clone and Install Dependencies

```bash
cd med_backend
npm install
```

### Step 2: Install PostgreSQL

**Windows:**
```bash
# Download and install from https://www.postgresql.org/download/windows/
# Or use Chocolatey:
choco install postgresql
```

**Mac:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

---

## ⚙️ Environment Setup

### Step 1: Create `.env` file

Copy the example file:
```bash
cp .env.example .env
```

### Step 2: Configure Environment Variables

Edit `.env` file:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/medtrack_db?schema=public"

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d

# Email Configuration (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
EMAIL_FROM=MedTrack <noreply@medtrack.com>

# OTP Configuration
OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=5

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

### Step 3: Setup Gmail App Password

1. Go to your [Google Account](https://myaccount.google.com/)
2. Navigate to **Security** → **2-Step Verification**
3. Scroll down to **App passwords**
4. Generate a new app password for "Mail"
5. Copy the 16-character password
6. Paste it in `.env` as `SMTP_PASS`

---

## 🗄️ Database Setup

### Step 1: Create PostgreSQL Database

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE medtrack_db;

# Exit
\q
```

### Step 2: Update DATABASE_URL

Replace `username` and `password` in `.env`:
```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/medtrack_db?schema=public"
```

### Step 3: Run Prisma Migrations

```bash
# Generate Prisma Client
npm run prisma:generate

# Create database tables
npm run prisma:migrate

# Alternative: Push schema without migrations
npm run prisma:push
```

### Step 4: View Database (Optional)

```bash
# Open Prisma Studio
npm run prisma:studio
```

---

## 🏃 Running the Server

### Development Mode (with auto-restart)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Server will start at:
```
http://localhost:5000
```

### Check API health:
```bash
curl http://localhost:5000/api/health-check
```

Response:
```json
{
  "status": "ok",
  "message": "MedTrack Backend API is running",
  "timestamp": "2025-01-29T10:30:00.000Z"
}
```

---

## Deployment

### Production startup flow

```bash
npm ci
npm run build
npm run prisma:migrate:deploy
npm start
```

### Required deployment environment variables

Use `.env.example` as a template and configure these values in your hosting platform:

- `NODE_ENV=production`
- `PORT=5000` (or platform-provided port)
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRE`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`
- `OTP_EXPIRY_MINUTES`, `OTP_MAX_ATTEMPTS`
- `EXTRACTION_MODE`
- `CORS_ORIGINS` (comma-separated list of allowed frontend origins)
- `FIREBASE_SERVICE_ACCOUNT` or `FIREBASE_SERVICE_ACCOUNT_PATH`

### CORS behavior

- If `CORS_ORIGINS` (or `FRONTEND_URL`) is set, only those origins are allowed.
- If none is set, the server allows any origin as a development fallback.

### Docker deployment (optional)

```bash
docker build -t medtrack-backend .
docker run --env-file .env -p 5000:5000 medtrack-backend
```

---

## 📡 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### 1. Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "1234567890",
  "password": "password123"
}
```

#### 2. Verify OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "john@example.com",
  "otpCode": "123456"
}
```

#### 3. Resend OTP
```http
POST /api/auth/resend-otp
Content-Type: application/json

{
  "email": "john@example.com"
}
```

#### 4. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "phoneNumber": "1234567890",
  "password": "password123"
}
```

#### 5. Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

#### 6. Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "email": "john@example.com",
  "otpCode": "123456",
  "newPassword": "newpassword123"
}
```

#### 7. Get Profile (Protected)
```http
GET /api/auth/profile
Authorization: Bearer <JWT_TOKEN>
```

---

### Report Endpoints (All Protected)

#### 1. Upload Report
```http
POST /api/reports
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "testType": "Blood Test",
  "reportDate": "2025-01-29",
  "ocrText": "Glucose: 95 mg/dL\nCholesterol: 180 mg/dL",
  "testResults": [
    {
      "testName": "Blood Test",
      "parameterName": "Glucose",
      "value": "95",
      "unit": "mg/dL",
      "status": "NORMAL",
      "referenceRange": "70-100"
    }
  ]
}
```

#### 2. Get All Reports
```http
GET /api/reports?page=1&limit=10&testType=Blood Test
Authorization: Bearer <JWT_TOKEN>
```

#### 3. Get Single Report
```http
GET /api/reports/:id
Authorization: Bearer <JWT_TOKEN>
```

#### 4. Delete Report
```http
DELETE /api/reports/:id
Authorization: Bearer <JWT_TOKEN>
```

#### 5. Get Test Types
```http
GET /api/reports/test-types
Authorization: Bearer <JWT_TOKEN>
```

---

### Health Analysis Endpoints (All Protected)

#### 1. Generate Health Summary
```http
POST /api/health/summary
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "reportIds": ["report-uuid-1", "report-uuid-2"]
}
```

#### 2. Get Latest Summary
```http
GET /api/health/summary/latest
Authorization: Bearer <JWT_TOKEN>
```

#### 3. Get All Summaries
```http
GET /api/health/summary?page=1&limit=10
Authorization: Bearer <JWT_TOKEN>
```

#### 4. Get Parameter Trends
```http
GET /api/health/trends?parameter=Glucose&months=6
Authorization: Bearer <JWT_TOKEN>
```

#### 5. Get Test Type Insights
```http
GET /api/health/insights/:testType
Authorization: Bearer <JWT_TOKEN>
```

---

### History Endpoints (All Protected)

#### 1. Get Full History
```http
GET /api/history?page=1&limit=20&testType=Blood Test&month=1&year=2025
Authorization: Bearer <JWT_TOKEN>
```

#### 2. Get Graph Data
```http
GET /api/history/graph?parameter=Glucose&months=12
Authorization: Bearer <JWT_TOKEN>
```

#### 3. Get Statistics
```http
GET /api/history/statistics
Authorization: Bearer <JWT_TOKEN>
```

#### 4. Get Monthly Summary
```http
GET /api/history/monthly?year=2025
Authorization: Bearer <JWT_TOKEN>
```

#### 5. Compare Reports
```http
GET /api/history/compare?reportId1=uuid1&reportId2=uuid2
Authorization: Bearer <JWT_TOKEN>
```

---

## 🔒 Security Features

1. **Password Hashing:** bcrypt with salt rounds
2. **JWT Authentication:** Secure token-based auth
3. **OTP Expiry:** 10 minutes expiration
4. **Rate Limiting:** Max 5 OTP attempts
5. **Input Validation:** express-validator for all inputs
6. **SQL Injection Prevention:** Prisma ORM parameterized queries
7. **CORS Protection:** Configurable origins
8. **Error Handling:** No sensitive data in error messages
9. **Environment Variables:** Secrets in .env (not committed)

---

## 🧪 Testing

### Manual Testing with cURL

**Register:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","phoneNumber":"9876543210","password":"test123"}'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9876543210","password":"test123"}'
```

---

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready

# Restart PostgreSQL
# Windows: services.msc → PostgreSQL
# Mac: brew services restart postgresql
# Linux: sudo systemctl restart postgresql
```

### Email Not Sending
1. Verify Gmail app password is correct
2. Enable "Less secure app access" (if needed)
3. Check firewall/antivirus blocking port 587

### Prisma Issues
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Regenerate Prisma Client
npm run prisma:generate
```

---

## 📝 Database Schema

```prisma
model User {
  id            String   @id @default(uuid())
  name          String
  email         String   @unique
  phoneNumber   String   @unique
  passwordHash  String
  isVerified    Boolean  @default(false)
  createdAt     DateTime @default(now())
  
  otpVerifications OtpVerification[]
  reports          Report[]
  healthSummaries  HealthSummary[]
}

model OtpVerification {
  id        String   @id @default(uuid())
  userId    String
  otpCode   String
  attempts  Int      @default(0)
  expiresAt DateTime
  verified  Boolean  @default(false)
  purpose   String   // "registration" or "password_reset"
  
  user User @relation(fields: [userId], references: [id])
}

model Report {
  id         String   @id @default(uuid())
  userId     String
  testType   String
  reportDate DateTime
  ocrText    String?
  
  user        User         @relation(fields: [userId], references: [id])
  testResults TestResult[]
}

model TestResult {
  id            String  @id @default(uuid())
  reportId      String
  testName      String
  parameterName String
  value         String
  unit          String?
  status        String  // "NORMAL", "HIGH", "LOW"
  referenceRange String?
  
  report Report @relation(fields: [reportId], references: [id])
}

model HealthSummary {
  id          String   @id @default(uuid())
  userId      String
  summaryText String
  insights    String?
  reportIds   String[]
  createdAt   DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id])
}
```

---

## 📞 Support

For issues or questions:
1. Check troubleshooting section
2. Review API documentation
3. Check server logs for errors

---

## 📜 License

This project is for educational purposes (college project).

---

## 🎓 College Project Notes

**Suitable for:**
- Final year projects
- Web development courses
- Full-stack demonstrations
- Real-world practice

**Key Learning Points:**
- RESTful API design
- Database modeling with Prisma
- Authentication & authorization
- Email integration
- Error handling
- Security best practices
- MVC architecture

---

**Built with ❤️ for MedTrack Healthcare App**
