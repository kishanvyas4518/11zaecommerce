-- Add AI Provider columns to user_settings
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS ai_provider TEXT DEFAULT 'gemini',
ADD COLUMN IF NOT EXISTS ai_api_key TEXT;
