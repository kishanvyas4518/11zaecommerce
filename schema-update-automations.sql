-- Automation Schema Update for 11za Commerce

-- 1. Automation Rules (Stores the 10 spreadsheet permutations per SaaS client)
CREATE TABLE public.automation_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_type TEXT NOT NULL, -- 'NEW' or 'EXISTING'
    last_event_type TEXT NOT NULL, -- 'VIEW' or 'CART' or 'HIE'
    has_hie BOOLEAN NOT NULL DEFAULT false,
    delay_minutes INTEGER NOT NULL, -- Delay before sending e.g. 120 (2 hr), 2880 (48 hr)
    template_id TEXT NOT NULL, -- '1','2'... '10' from the spreadsheet
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, customer_type, last_event_type, has_hie)
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own rules" ON public.automation_rules FOR ALL USING (auth.uid() = user_id);

-- 2. Customer States (Current tracked state per customer)
CREATE TABLE public.customer_states (
    customer_id UUID PRIMARY KEY REFERENCES public.customers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_type TEXT DEFAULT 'NEW',
    last_event_type TEXT DEFAULT 'VIEW',
    has_hie BOOLEAN DEFAULT false,
    order_count INTEGER DEFAULT 0,
    blocked_until TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.customer_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own customer states" ON public.customer_states FOR SELECT USING (auth.uid() = user_id);

-- 3. Automation Logs (For Live Tracking Dashboard)
CREATE TABLE public.automation_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- 'SCHEDULED', 'SENT', 'CANCELLED'
    template_id TEXT NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Realtime for logs so the Dashboard can show "Live Tracking"
alter publication supabase_realtime add table public.automation_logs;

ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view logic logs" ON public.automation_logs FOR SELECT USING (auth.uid() = user_id);
