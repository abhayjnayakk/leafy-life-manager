-- ============================================================
-- LEAFY LIFE MANAGER — Database Fix & Migration Script
-- Run this ENTIRE script in your Supabase SQL Editor
--
-- Safe to run multiple times (all statements are idempotent)
--
-- What it does:
-- 1. Creates tasks table if missing (with completed_by)
-- 2. Adds completed_by column if tasks table exists without it
-- 3. Removes duplicate rows from all affected tables
-- 4. Adds UNIQUE constraints to prevent future duplicates
-- ============================================================


-- ============================================================
-- SECTION A: TASKS TABLE — CREATE OR MIGRATE
-- ============================================================

-- Create table if it doesn't exist at all
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

-- If table already existed without completed_by, add it now
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_by TEXT;

-- Enable realtime (safe — ignores if already added)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Enable RLS + open policy (safe — ignores if already exists)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all" ON tasks FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- ============================================================
-- SECTION B: DEDUPLICATE EXISTING DATA
-- Keeps the oldest row (by created_at) for each natural key
-- ============================================================

-- 1. Ingredients — dedup on name
DELETE FROM ingredients WHERE id NOT IN (
  SELECT DISTINCT ON (name) id
  FROM ingredients
  ORDER BY name, created_at ASC, id ASC
);

-- 2. Menu items — dedup on name
DELETE FROM menu_items WHERE id NOT IN (
  SELECT DISTINCT ON (name) id
  FROM menu_items
  ORDER BY name, created_at ASC, id ASC
);

-- 3. Recipes — dedup on (name, menu_item_id, size_variant)
DELETE FROM recipes WHERE id NOT IN (
  SELECT DISTINCT ON (name, menu_item_id, COALESCE(size_variant, '')) id
  FROM recipes
  ORDER BY name, menu_item_id, COALESCE(size_variant, ''), created_at ASC, id ASC
);

-- 4. Recipe ingredients — dedup on (recipe_id, ingredient_id)
DELETE FROM recipe_ingredients WHERE id NOT IN (
  SELECT DISTINCT ON (recipe_id, ingredient_id) id
  FROM recipe_ingredients
  ORDER BY recipe_id, ingredient_id, created_at ASC, id ASC
);

-- 5. Alert rules — dedup on name
DELETE FROM alert_rules WHERE id NOT IN (
  SELECT DISTINCT ON (name) id
  FROM alert_rules
  ORDER BY name, created_at ASC, id ASC
);

-- 6. Bowl templates — dedup on name
DELETE FROM bowl_templates WHERE id NOT IN (
  SELECT DISTINCT ON (name) id
  FROM bowl_templates
  ORDER BY name, created_at ASC, id ASC
);

-- 7. Bowl components — dedup on (bowl_template_id, component_type, name)
DELETE FROM bowl_components WHERE id NOT IN (
  SELECT DISTINCT ON (bowl_template_id, component_type, name) id
  FROM bowl_components
  ORDER BY bowl_template_id, component_type, name, created_at ASC, id ASC
);

-- 8. App settings — dedup on key
DELETE FROM app_settings WHERE id NOT IN (
  SELECT DISTINCT ON (key) id
  FROM app_settings
  ORDER BY key, updated_at ASC, id ASC
);


-- ============================================================
-- SECTION C: ADD UNIQUE CONSTRAINTS (prevent future duplicates)
-- Safe — uses DO blocks to skip if constraint already exists
-- ============================================================

DO $$ BEGIN
  ALTER TABLE ingredients ADD CONSTRAINT ingredients_name_unique UNIQUE (name);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE menu_items ADD CONSTRAINT menu_items_name_unique UNIQUE (name);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE recipes ADD CONSTRAINT recipes_name_menu_size_unique
    UNIQUE (name, menu_item_id, size_variant);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE recipe_ingredients ADD CONSTRAINT recipe_ingredients_recipe_ingredient_unique
    UNIQUE (recipe_id, ingredient_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE alert_rules ADD CONSTRAINT alert_rules_name_unique UNIQUE (name);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE bowl_templates ADD CONSTRAINT bowl_templates_name_unique UNIQUE (name);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE bowl_components ADD CONSTRAINT bowl_components_template_type_name_unique
    UNIQUE (bowl_template_id, component_type, name);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
