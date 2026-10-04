-- ====================================================================
-- SmartBite – Intelligent Kitchen Inventory & Waste Reducer
-- Initial Supabase PostgreSQL Schema Migration
-- ====================================================================

-- Enable pgcrypto / uuid-ossp if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------
-- TABLE 1: profiles
-- Linked to Supabase auth.users
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------
-- TABLE 2: food_categories
-- System reference table for inventory classification & shelf life
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.food_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    icon TEXT,
    default_shelf_life_days INTEGER NOT NULL DEFAULT 7,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------
-- TABLE 3: inventory_items
-- Food items tracked in pantry, fridge, freezer, etc.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category_id UUID REFERENCES public.food_categories(id) ON DELETE SET NULL,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'item',
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date TIMESTAMPTZ NOT NULL,
    expiry_source TEXT NOT NULL DEFAULT 'USER_PROVIDED' CHECK (expiry_source IN ('USER_PROVIDED', 'ESTIMATED', 'OCR', 'VOICE', 'BARCODE')),
    storage_location TEXT NOT NULL DEFAULT 'Fridge',
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'USED', 'DONATED', 'COMPOSTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    used_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

-- --------------------------------------------------------------------
-- TABLE 4: notifications
-- Alert system records (48h before, 24h before, expired, system)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('EXPIRY_48H', 'EXPIRY_24H', 'EXPIRED', 'SYSTEM')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Enforce idempotency: an item must not receive the same expiry alert type twice
    CONSTRAINT uq_item_notification_type UNIQUE (inventory_item_id, type)
);

-- --------------------------------------------------------------------
-- TABLE 5: inventory_events
-- Food lifecycle events for waste analytics and behavior tracking
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('ADDED', 'USED', 'DONATED', 'COMPOSTED', 'EXPIRED')),
    quantity NUMERIC NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------
-- TABLE 6: recipes
-- Recipe suggestions generated or saved by user
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    preparation_time_minutes INTEGER NOT NULL DEFAULT 15,
    difficulty TEXT NOT NULL DEFAULT 'Easy' CHECK (difficulty IN ('Easy', 'Medium', 'Hard', 'A little project')),
    instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------
-- TABLE 7: recipe_ingredients
-- Individual ingredients mapped to pantry items when available
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
    ingredient_name TEXT NOT NULL,
    quantity TEXT,
    is_expiring_item BOOLEAN NOT NULL DEFAULT FALSE
);

-- --------------------------------------------------------------------
-- TABLE 8: parsing_logs
-- Audit log of text / voice / OCR parsing requests
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parsing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    input_type TEXT NOT NULL CHECK (input_type IN ('TEXT', 'VOICE', 'OCR', 'BARCODE')),
    raw_input TEXT,
    parsed_result JSONB,
    confidence NUMERIC NOT NULL DEFAULT 0.90,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------
-- TABLE 9: receipt_uploads
-- Metadata and state tracking for receipt processing
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.receipt_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    ocr_status TEXT NOT NULL DEFAULT 'UPLOADED' CHECK (ocr_status IN ('UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED')),
    ocr_result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------
-- TABLE 10: notification_preferences
-- User notification configurations
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    enable_24h BOOLEAN NOT NULL DEFAULT TRUE,
    enable_48h BOOLEAN NOT NULL DEFAULT TRUE,
    enable_email BOOLEAN NOT NULL DEFAULT TRUE,
    enable_push BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------
-- INDEXES
-- Critical for low-latency queries & scheduled workers
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_inventory_items_user_id ON public.inventory_items(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_expiry_date ON public.inventory_items(expiry_date);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category_id ON public.inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON public.inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON public.notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_inventory_events_user_id ON public.inventory_events(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_events_created_at ON public.inventory_events(created_at);
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON public.recipes(user_id);

-- --------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- Restricts every operation strictly to the authenticated user
-- --------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parsing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- food_categories: readable by any authenticated user
CREATE POLICY "food_categories_select" ON public.food_categories
    FOR SELECT TO authenticated USING (true);

-- profiles: user can read/write their own profile
CREATE POLICY "profiles_owner_all" ON public.profiles
    FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- inventory_items: user can read/write their own items
CREATE POLICY "inventory_items_owner_all" ON public.inventory_items
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- notifications: user can read/update/delete their own notifications
CREATE POLICY "notifications_owner_all" ON public.notifications
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- inventory_events: user can read/insert their own events
CREATE POLICY "inventory_events_owner_all" ON public.inventory_events
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- recipes: user can read their own or public recipes, write their own
CREATE POLICY "recipes_owner_all" ON public.recipes
    FOR ALL TO authenticated USING (user_id IS NULL OR auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- recipe_ingredients: accessible if parent recipe is accessible
CREATE POLICY "recipe_ingredients_owner_all" ON public.recipe_ingredients
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_ingredients.recipe_id AND (r.user_id IS NULL OR r.user_id = auth.uid()))
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_ingredients.recipe_id AND r.user_id = auth.uid())
    );

-- parsing_logs: user can access their own logs
CREATE POLICY "parsing_logs_owner_all" ON public.parsing_logs
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- receipt_uploads: user can access their own receipt uploads
CREATE POLICY "receipt_uploads_owner_all" ON public.receipt_uploads
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- notification_preferences: user can access their own preferences
CREATE POLICY "notification_preferences_owner_all" ON public.notification_preferences
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- --------------------------------------------------------------------
-- VIEW: inventory_with_freshness
-- Dynamic freshness status calculation using postgres time functions
-- --------------------------------------------------------------------
CREATE OR REPLACE VIEW public.inventory_with_freshness AS
SELECT
    i.id,
    i.user_id,
    i.name,
    i.category_id,
    c.name AS category_name,
    c.icon AS category_icon,
    i.quantity,
    i.unit,
    i.purchase_date,
    i.expiry_date,
    i.expiry_source,
    i.storage_location,
    i.notes,
    i.status,
    i.created_at,
    i.updated_at,
    -- Dynamic freshness calculation
    CASE
        WHEN i.expiry_date < now() THEN 'EXPIRED'
        WHEN i.expiry_date <= (now() + INTERVAL '48 hours') THEN 'EXPIRING_SOON'
        ELSE 'FRESH'
    END AS freshness_status,
    -- Time remaining in hours and days
    EXTRACT(EPOCH FROM (i.expiry_date - now())) / 3600.0 AS hours_remaining,
    ROUND(EXTRACT(EPOCH FROM (i.expiry_date - now())) / 86400.0, 1) AS days_remaining
FROM public.inventory_items i
LEFT JOIN public.food_categories c ON c.id = i.category_id
WHERE i.deleted_at IS NULL;

-- --------------------------------------------------------------------
-- TRIGGERS & FUNCTIONS
-- --------------------------------------------------------------------

-- 1. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_inventory_items_updated_at
    BEFORE UPDATE ON public.inventory_items
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_notification_preferences_updated_at
    BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Status change audit event trigger on inventory_items
CREATE OR REPLACE FUNCTION public.handle_inventory_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.inventory_events (user_id, inventory_item_id, event_type, quantity, created_at)
        VALUES (NEW.user_id, NEW.id, 'ADDED', NEW.quantity, now());
    ELSIF (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status IN ('USED', 'DONATED', 'COMPOSTED')) THEN
        INSERT INTO public.inventory_events (user_id, inventory_item_id, event_type, quantity, created_at)
        VALUES (NEW.user_id, NEW.id, NEW.status, NEW.quantity, now());
        NEW.used_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_inventory_status_event
    AFTER INSERT OR UPDATE OF status ON public.inventory_items
    FOR EACH ROW EXECUTE FUNCTION public.handle_inventory_status_change();

-- 3. Function to get expiring items within 48 hours for user
CREATE OR REPLACE FUNCTION public.get_expiring_items(p_user_id UUID)
RETURNS SETOF public.inventory_with_freshness AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.inventory_with_freshness
    WHERE user_id = p_user_id
      AND status = 'ACTIVE'
      AND freshness_status IN ('EXPIRING_SOON', 'EXPIRED')
    ORDER BY expiry_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function for dashboard statistics
CREATE OR REPLACE FUNCTION public.get_dashboard_analytics(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_total INTEGER;
    v_fresh INTEGER;
    v_expiring INTEGER;
    v_expired INTEGER;
    v_used INTEGER;
    v_donated INTEGER;
    v_composted INTEGER;
BEGIN
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE freshness_status = 'FRESH'),
        COUNT(*) FILTER (WHERE freshness_status = 'EXPIRING_SOON'),
        COUNT(*) FILTER (WHERE freshness_status = 'EXPIRED')
    INTO v_total, v_fresh, v_expiring, v_expired
    FROM public.inventory_with_freshness
    WHERE user_id = p_user_id AND status = 'ACTIVE';

    SELECT
        COUNT(*) FILTER (WHERE event_type = 'USED'),
        COUNT(*) FILTER (WHERE event_type = 'DONATED'),
        COUNT(*) FILTER (WHERE event_type = 'COMPOSTED')
    INTO v_used, v_donated, v_composted
    FROM public.inventory_events
    WHERE user_id = p_user_id;

    RETURN json_build_object(
        'total_items', COALESCE(v_total, 0),
        'fresh_items', COALESCE(v_fresh, 0),
        'expiring_items', COALESCE(v_expiring, 0),
        'expired_items', COALESCE(v_expired, 0),
        'used_items', COALESCE(v_used, 0),
        'donated_items', COALESCE(v_donated, 0),
        'composted_items', COALESCE(v_composted, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------------------
-- SUPABASE STORAGE BUCKET POLICIES
-- Setup private bucket 'receipts'
-- --------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "receipts_upload_owner" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "receipts_read_owner" ON storage.objects
    FOR SELECT TO authenticated USING (
        bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- --------------------------------------------------------------------
-- SEED DATA
-- Categories with configurable shelf life estimates
-- --------------------------------------------------------------------
INSERT INTO public.food_categories (name, icon, default_shelf_life_days)
VALUES
    ('Dairy', 'milk', 7),
    ('Vegetables', 'carrot', 5),
    ('Fruits', 'apple', 6),
    ('Meat', 'beef', 3),
    ('Bakery', 'croissant', 4),
    ('Pantry', 'package', 60),
    ('Frozen', 'snowflake', 90),
    ('Beverages', 'cup-soda', 14),
    ('Other', 'utensils', 7)
ON CONFLICT (name) DO UPDATE
SET default_shelf_life_days = EXCLUDED.default_shelf_life_days,
    icon = EXCLUDED.icon;
