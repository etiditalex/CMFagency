-- Enable multi-shift support for retail/hospitality accounts
-- Shifts: 1st (6am-3pm), 2nd (3:30pm-11pm)

-- Add shift columns to visitor_employees_reporting_settings
ALTER TABLE visitor_employees_reporting_settings
ADD COLUMN IF NOT EXISTS shift_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS shift_1_start_time time without time zone DEFAULT '06:00',
ADD COLUMN IF NOT EXISTS shift_1_end_time time without time zone DEFAULT '15:00',
ADD COLUMN IF NOT EXISTS shift_2_start_time time without time zone DEFAULT '15:30',
ADD COLUMN IF NOT EXISTS shift_2_end_time time without time zone DEFAULT '23:00',
ADD COLUMN IF NOT EXISTS shift_1_sign_in_start_time time without time zone DEFAULT '06:00',
ADD COLUMN IF NOT EXISTS shift_1_sign_in_time time without time zone DEFAULT '08:00',
ADD COLUMN IF NOT EXISTS shift_1_sign_out_time time without time zone DEFAULT '15:00',
ADD COLUMN IF NOT EXISTS shift_2_sign_in_start_time time without time zone DEFAULT '15:30',
ADD COLUMN IF NOT EXISTS shift_2_sign_in_time time without time zone DEFAULT '16:00',
ADD COLUMN IF NOT EXISTS shift_2_sign_out_time time without time zone DEFAULT '23:00';

-- Add shift tracking to attendance events
ALTER TABLE visitor_employees_attendance_events
ADD COLUMN IF NOT EXISTS shift_number integer DEFAULT NULL;

-- Add index for shift-based queries
CREATE INDEX IF NOT EXISTS idx_attendance_employee_day_shift 
ON visitor_employees_attendance_events(employee_id, created_at DESC, shift_number);

-- Create settings view for easy access
CREATE OR REPLACE VIEW v_employee_shift_settings AS
SELECT 
    owner_id,
    shift_enabled,
    CASE 
        WHEN shift_1_start_time IS NOT NULL 
        THEN ARRAY[
            jsonb_build_object(
                'shift_number', 1,
                'start_time', shift_1_start_time::text,
                'end_time', shift_1_end_time::text,
                'sign_in_start_time', shift_1_sign_in_start_time::text,
                'sign_in_time', shift_1_sign_in_time::text,
                'sign_out_time', shift_1_sign_out_time::text
            ),
            jsonb_build_object(
                'shift_number', 2,
                'start_time', shift_2_start_time::text,
                'end_time', shift_2_end_time::text,
                'sign_in_start_time', shift_2_sign_in_start_time::text,
                'sign_in_time', shift_2_sign_in_time::text,
                'sign_out_time', shift_2_sign_out_time::text
            )
        ]
        ELSE NULL
    END as shifts,
    updated_at
FROM visitor_employees_reporting_settings;

-- Add comment documenting shifts
COMMENT ON COLUMN visitor_employees_reporting_settings.shift_enabled 
IS 'Enable multi-shift support for retail/hospitality accounts';

COMMENT ON COLUMN visitor_employees_reporting_settings.shift_1_start_time 
IS 'Shift 1 start time (e.g., 06:00 for 6am)';

COMMENT ON COLUMN visitor_employees_reporting_settings.shift_1_end_time 
IS 'Shift 1 end time (e.g., 15:00 for 3pm)';

COMMENT ON COLUMN visitor_employees_reporting_settings.shift_2_start_time 
IS 'Shift 2 start time (e.g., 15:30 for 3:30pm)';

COMMENT ON COLUMN visitor_employees_reporting_settings.shift_2_end_time 
IS 'Shift 2 end time (e.g., 23:00 for 11pm)';
