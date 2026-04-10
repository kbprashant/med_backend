/*
  Warnings:

  - Added the required column `category` to the `reports` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "health_summaries" ADD COLUMN     "keyIssues" TEXT,
ADD COLUMN     "recommendations" TEXT;

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "centerId" TEXT,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "filePath" TEXT,
ADD COLUMN     "subcategory" TEXT;

-- AlterTable
ALTER TABLE "test_results" ADD COLUMN     "parameterId" TEXT,
ADD COLUMN     "testDefinitionId" TEXT;

-- CreateTable
CREATE TABLE "lab_centers" (
    "id" TEXT NOT NULL,
    "centerName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "location" TEXT,
    "phoneNumber" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_master" (
    "id" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_parameters" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "parameterName" TEXT NOT NULL,
    "unit" TEXT,
    "normalMin" DOUBLE PRECISION,
    "normalMax" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lab_centers_centerName_idx" ON "lab_centers"("centerName");

-- CreateIndex
CREATE UNIQUE INDEX "test_master_testName_key" ON "test_master"("testName");

-- CreateIndex
CREATE INDEX "test_master_category_subcategory_idx" ON "test_master"("category", "subcategory");

-- CreateIndex
CREATE INDEX "test_parameters_testId_idx" ON "test_parameters"("testId");

-- CreateIndex
CREATE INDEX "test_parameters_parameterName_idx" ON "test_parameters"("parameterName");

-- CreateIndex
CREATE INDEX "health_summaries_userId_reportId_idx" ON "health_summaries"("userId", "reportId");

-- CreateIndex
CREATE INDEX "reports_userId_category_subcategory_idx" ON "reports"("userId", "category", "subcategory");

-- CreateIndex
CREATE INDEX "reports_reportDate_idx" ON "reports"("reportDate");

-- CreateIndex
CREATE INDEX "test_definitions_parameterName_idx" ON "test_definitions"("parameterName");

-- CreateIndex
CREATE INDEX "test_results_reportId_idx" ON "test_results"("reportId");

-- CreateIndex
CREATE INDEX "test_results_testDefinitionId_idx" ON "test_results"("testDefinitionId");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "lab_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_parameters" ADD CONSTRAINT "test_parameters_testId_fkey" FOREIGN KEY ("testId") REFERENCES "test_master"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_testDefinitionId_fkey" FOREIGN KEY ("testDefinitionId") REFERENCES "test_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_parameterId_fkey" FOREIGN KEY ("parameterId") REFERENCES "test_parameters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_summaries" ADD CONSTRAINT "health_summaries_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
