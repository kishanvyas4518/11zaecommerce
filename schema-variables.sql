-- 1. Add variable config JSONB column to storing how {{1}}, {{2}} are mapped
ALTER TABLE public.automation_rules
ADD COLUMN IF NOT EXISTS template_variables_config JSONB DEFAULT '{}'::jsonb;

-- 2. Add rule_id to logs to track which rule config to use during execution
ALTER TABLE public.automation_logs
ADD COLUMN IF NOT EXISTS rule_id UUID REFERENCES public.automation_rules(id) ON DELETE SET NULL;
