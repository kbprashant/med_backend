# MedTrack Backend - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies
```bash
cd med_backend
npm install
```

### Step 2: Setup PostgreSQL
```bash
# Install PostgreSQL if not installed
# Windows: https://www.postgresql.org/download/windows/
# Mac: brew install postgresql
# Linux: sudo apt-get install postgresql

# Create database
psql -U postgres
CREATE DATABASE medtrack_db;
\q
```

### Step 3: Configure Environment
```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env and update:
# - DATABASE_URL with your PostgreSQL credentials
# - SMTP_USER and SMTP_PASS with Gmail credentials
# - JWT_SECRET with a random secure string
```

### Step 4: Setup Database Schema
```bash
npm run prisma:generate
npm run prisma:push
```

### Step 5: Start Server
```bash
npm run dev
```

Server will start at: **http://localhost:5000**

### Step 6: Test API
```bash
curl http://localhost:5000/api/health-check
```

## 📧 Gmail SMTP Setup

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**
3. Go to **App passwords**
4. Generate password for "Mail"
5. Copy 16-character password to `.env` as `SMTP_PASS`

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/login` - Login
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/profile` - Get user profile (protected)

### Reports (Protected)
- `POST /api/reports` - Upload report
- `GET /api/reports` - Get all reports
- `GET /api/reports/:id` - Get single report
- `DELETE /api/reports/:id` - Delete report

### Health Analysis (Protected)
- `POST /api/health/summary` - Generate health summary
- `GET /api/health/summary/latest` - Get latest summary
- `GET /api/health/trends` - Get parameter trends

### History (Protected)
- `GET /api/history` - Get full history with filters
- `GET /api/history/graph` - Get graph data
- `GET /api/history/statistics` - Get statistics

## 🛠️ Useful Commands

```bash
# Development (auto-restart)
npm run dev

# Production
npm start

# Database operations
npm run prisma:generate    # Generate Prisma Client
npm run prisma:push        # Push schema to database
npm run prisma:migrate     # Create migration
npm run prisma:studio      # Open database GUI

# View logs
# Server logs appear in console
```

## 📝 Example Usage

### 1. Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "9876543210",
    "password": "test123"
  }'
```

### 2. Verify OTP (check email)
```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "otpCode": "123456"
  }'
```

### 3. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "9876543210",
    "password": "test123"
  }'
```

Response includes JWT token - use it in subsequent requests:
```bash
curl http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🐛 Common Issues

**Database connection error:**
- Check PostgreSQL is running
- Verify DATABASE_URL in .env
- Ensure database exists

**Email not sending:**
- Verify Gmail app password
- Check SMTP settings in .env
- Ensure 2-Step Verification is enabled

**Port already in use:**
- Change PORT in .env to another port (e.g., 5001)

## 📚 Next Steps

1. Read full [README.md](README.md) for detailed documentation
2. Test all API endpoints
3. Integrate with Flutter frontend
4. Customize health analysis logic
5. Add more test types and reference ranges

---

**Need help?** Check the main README.md or server console logs for errors.
