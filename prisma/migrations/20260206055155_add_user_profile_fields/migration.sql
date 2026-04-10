-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "bloodGroup" TEXT,
    "address" TEXT,
    "medicalHistory" TEXT,
    "currentMedicines" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_verifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "otpCode" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "purpose" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "testType" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "ocrText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_results" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "testCategory" TEXT NOT NULL,
    "testSubCategory" TEXT,
    "testName" TEXT NOT NULL,
    "parameterName" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "status" TEXT NOT NULL,
    "referenceRange" TEXT,
    "normalMin" DOUBLE PRECISION,
    "normalMax" DOUBLE PRECISION,
    "testDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_summaries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "summaryText" TEXT NOT NULL,
    "insights" TEXT,
    "overallStatus" TEXT NOT NULL,
    "abnormalCount" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_definitions" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "parameterName" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "normalMinValue" DOUBLE PRECISION,
    "normalMaxValue" DOUBLE PRECISION,
    "riskLevelLogic" TEXT NOT NULL,
    "isQualitative" BOOLEAN NOT NULL DEFAULT false,
    "genderSpecific" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "users"("phoneNumber");

-- CreateIndex
CREATE INDEX "test_results_testName_testDate_idx" ON "test_results"("testName", "testDate");

-- CreateIndex
CREATE INDEX "test_results_testCategory_testSubCategory_idx" ON "test_results"("testCategory", "testSubCategory");

-- CreateIndex
CREATE UNIQUE INDEX "test_definitions_testId_key" ON "test_definitions"("testId");

-- CreateIndex
CREATE INDEX "test_definitions_categoryName_idx" ON "test_definitions"("categoryName");

-- CreateIndex
CREATE INDEX "test_definitions_testName_idx" ON "test_definitions"("testName");

-- CreateIndex
CREATE INDEX "test_definitions_testId_idx" ON "test_definitions"("testId");

-- AddForeignKey
ALTER TABLE "otp_verifications" ADD CONSTRAINT "otp_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_summaries" ADD CONSTRAINT "health_summaries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
