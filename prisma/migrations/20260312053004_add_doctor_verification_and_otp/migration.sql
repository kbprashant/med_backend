-- AlterTable
ALTER TABLE "doctors" ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "hospital" DROP NOT NULL,
ALTER COLUMN "clinicName" DROP NOT NULL,
ALTER COLUMN "clinicAddress" DROP NOT NULL;

-- CreateTable
CREATE TABLE "doctor_otp_verifications" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "otpCode" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "purpose" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_otp_verifications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "doctor_otp_verifications" ADD CONSTRAINT "doctor_otp_verifications_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
