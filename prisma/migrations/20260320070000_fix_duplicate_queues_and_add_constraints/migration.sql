-- Step 1: Clear existing queue numbers for non-confirmed appointments
UPDATE "appointments" 
SET "queueNumber" = NULL 
WHERE status != 'confirmed';

-- Step 2: Fix duplicate queue numbers by renumbering confirmed appointments
-- Group by doctor/date/schedule and assign sequential queue numbers
WITH queue_fix AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "doctorId", "appointmentDate", "scheduleId" 
      ORDER BY "createdAt" ASC
    ) AS fixed_queue_number
  FROM "appointments"
  WHERE status = 'confirmed' AND "queueNumber" IS NOT NULL
)
UPDATE "appointments"
SET "queueNumber" = queue_fix.fixed_queue_number
FROM queue_fix
WHERE "appointments".id = queue_fix.id;

-- Step 3: Add unique constraint on queue
ALTER TABLE "appointments" 
ADD CONSTRAINT "queue_uniqueness" UNIQUE ("doctorId", "appointmentDate", "scheduleId", "queueNumber");

-- Step 4: Add performance index for queue counting
CREATE INDEX "queue_lookup" ON "appointments"("doctorId", "appointmentDate", "scheduleId", status);
