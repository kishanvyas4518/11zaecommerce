-- Supabase SQL schema for SaaS Webhook Tracker

-- 1. Configurations Table
CREATE TABLE public.configurations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    store_name TEXT NOT NULL,
    webhook_name TEXT,
    webhook_id UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS for configurations
ALTER TABLE public.configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own configuration" ON public.configurations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own configuration" ON public.configurations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own configuration" ON public.configurations
    FOR UPDATE USING (auth.uid() = user_id);

-- 2. Customers Table
CREATE TABLE public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    phone TEXT,
    first_name TEXT,
    last_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, email),
    UNIQUE(user_id, phone)
);

-- Enable RLS for customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own customers" ON public.customers
    FOR SELECT USING (auth.uid() = user_id);

-- 3. Events Table
CREATE TABLE public.events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL, -- e.g., 'add_to_cart', 'checkout', 'page_view'
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Realtime for events (Required for Next.js dashboard updates)
alter publication supabase_realtime add table public.events;

-- Enable RLS for events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own events" ON public.events
    FOR SELECT USING (auth.uid() = user_id);

-- 4. Service Role Bypass (For Node.js Backend Insertion)
-- The Node.js server uses the SERVICE_ROLE key, which bypasses RLS automatically.
