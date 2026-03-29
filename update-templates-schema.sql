-- Add components to whatsapp_templates table
ALTER TABLE public.whatsapp_templates 
ADD COLUMN IF NOT EXISTS header_type TEXT,
ADD COLUMN IF NOT EXISTS header_text TEXT,
ADD COLUMN IF NOT EXISTS header_url TEXT,
ADD COLUMN IF NOT EXISTS footer_text TEXT,
ADD COLUMN IF NOT EXISTS buttons_json JSONB DEFAULT '[]'::jsonb;
