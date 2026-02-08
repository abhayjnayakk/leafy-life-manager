-- ============================================================
-- LEAFY LIFE MANAGER — Supabase Table Setup
-- Run this ENTIRE script in your Supabase SQL Editor
-- ============================================================

-- 1. ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL,
  order_type TEXT NOT NULL DEFAULT 'DineIn',
  date TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  notes TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. DAILY REVENUE
CREATE TABLE IF NOT EXISTS daily_revenue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  total_sales NUMERIC NOT NULL DEFAULT 0,
  number_of_orders INT NOT NULL DEFAULT 0,
  payment_breakdown JSONB NOT NULL DEFAULT '{"cash":0,"upi":0,"card":0}',
  average_order_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INGREDIENTS
CREATE TABLE IF NOT EXISTS ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  current_stock NUMERIC NOT NULL DEFAULT 0,
  minimum_threshold NUMERIC NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC NOT NULL DEFAULT 0,
  last_restocked TEXT,
  expiry_date TEXT,
  storage_type TEXT,
  shelf_life_days INT,
  supplier TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MENU ITEMS
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  sizes JSONB NOT NULL DEFAULT '[]',
  is_customizable BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_day INT,
  receipt_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. APP SETTINGS
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ALERTS
CREATE TABLE IF NOT EXISTS alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  related_entity_id TEXT,
  related_entity_type TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ALERT RULES
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  condition TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. LOGIN HISTORY
CREATE TABLE IF NOT EXISTS login_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  role TEXT NOT NULL,
  login_at TIMESTAMPTZ DEFAULT NOW(),
  logout_at TIMESTAMPTZ
);

-- 10. RECIPES
CREATE TABLE IF NOT EXISTS recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id TEXT NOT NULL,
  name TEXT NOT NULL,
  size_variant TEXT,
  preparation_instructions TEXT,
  prep_time_minutes INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. RECIPE INGREDIENTS
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id TEXT NOT NULL,
  ingredient_id TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  is_optional BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. BOWL TEMPLATES
CREATE TABLE IF NOT EXISTS bowl_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  base_price_regular NUMERIC NOT NULL DEFAULT 0,
  base_price_large NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. BOWL COMPONENTS
CREATE TABLE IF NOT EXISTS bowl_components (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bowl_template_id TEXT NOT NULL,
  component_type TEXT NOT NULL,
  name TEXT NOT NULL,
  price_regular NUMERIC NOT NULL DEFAULT 0,
  price_large NUMERIC,
  is_included BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. TASKS
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_to TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ENABLE REALTIME ON ALL TABLES
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_revenue;
ALTER PUBLICATION supabase_realtime ADD TABLE ingredients;
ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE app_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE alert_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE login_history;
ALTER PUBLICATION supabase_realtime ADD TABLE recipes;
ALTER PUBLICATION supabase_realtime ADD TABLE recipe_ingredients;
ALTER PUBLICATION supabase_realtime ADD TABLE bowl_templates;
ALTER PUBLICATION supabase_realtime ADD TABLE bowl_components;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- ============================================================
-- ROW LEVEL SECURITY (allow all for now — no auth)
-- ============================================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON orders FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE daily_revenue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON daily_revenue FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON ingredients FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON menu_items FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON expenses FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON app_settings FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON alerts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON alert_rules FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON login_history FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON recipes FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON recipe_ingredients FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE bowl_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON bowl_templates FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE bowl_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON bowl_components FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON tasks FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- UNIQUE CONSTRAINTS (prevent duplicate data)
-- ============================================================
ALTER TABLE ingredients ADD CONSTRAINT ingredients_name_unique UNIQUE (name);
ALTER TABLE menu_items ADD CONSTRAINT menu_items_name_unique UNIQUE (name);
ALTER TABLE recipes ADD CONSTRAINT recipes_name_menu_size_unique UNIQUE (name, menu_item_id, size_variant);
ALTER TABLE recipe_ingredients ADD CONSTRAINT recipe_ingredients_recipe_ingredient_unique UNIQUE (recipe_id, ingredient_id);
ALTER TABLE alert_rules ADD CONSTRAINT alert_rules_name_unique UNIQUE (name);
ALTER TABLE bowl_templates ADD CONSTRAINT bowl_templates_name_unique UNIQUE (name);
ALTER TABLE bowl_components ADD CONSTRAINT bowl_components_template_type_name_unique UNIQUE (bowl_template_id, component_type, name);
