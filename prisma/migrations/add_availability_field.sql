-- Add availability column to doctor_schedule table
ALTER TABLE doctor_schedule ADD COLUMN availability VARCHAR(20) DEFAULT 'available';

-- Add comment to the column
COMMENT ON COLUMN doctor_schedule.availability IS 'Availability status: available, unavailable, or doubtful';

-- Update any NULL values to 'available' (just in case)
UPDATE doctor_schedule SET availability = 'available' WHERE availability IS NULL;
