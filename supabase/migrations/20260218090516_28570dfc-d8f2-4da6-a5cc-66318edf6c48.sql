-- Update platform_settings default name from GetLate to Longtale.ai
ALTER TABLE public.platform_settings ALTER COLUMN platform_name SET DEFAULT 'Longtale.ai';

-- Update global_email_settings default sender name 
ALTER TABLE public.global_email_settings ALTER COLUMN sender_name SET DEFAULT 'Longtale.ai';

-- Update company_email_settings default sender name
ALTER TABLE public.company_email_settings ALTER COLUMN sender_name SET DEFAULT 'Longtale.ai';

-- Update existing records
UPDATE public.platform_settings SET platform_name = 'Longtale.ai' WHERE platform_name = 'GetLate';
UPDATE public.global_email_settings SET sender_name = 'Longtale.ai' WHERE sender_name = 'GetLate';
UPDATE public.company_email_settings SET sender_name = 'Longtale.ai' WHERE sender_name = 'GetLate';