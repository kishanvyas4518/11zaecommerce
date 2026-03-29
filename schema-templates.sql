-- Automation Schema Update for WhatsApp Templates
CREATE TABLE public.whatsapp_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_name TEXT NOT NULL,
    template_id TEXT,
    category TEXT,
    status TEXT,
    body TEXT,
    language TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, template_name)
);

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own templates" ON public.whatsapp_templates FOR ALL USING (auth.uid() = user_id);
