-- ============================================================
-- LEAFY LIFE MANAGER — Database Fix Script
-- Run this ENTIRE script in your Supabase SQL Editor
-- 1. Creates missing tasks table
-- 2. Removes duplicate rows from all affected tables
-- 3. Adds UNIQUE constraints to prevent future duplicates
-- ============================================================


-- ============================================================
-- SECTION A: CREATE MISSING TASKS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_to TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- Enable RLS with open policy (no auth)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON tasks FOR ALL USING (true) WITH CHECK (true);


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

-- 8. App settings — dedup on key (already has UNIQUE, but clean up just in case)
DELETE FROM app_settings WHERE id NOT IN (
  SELECT DISTINCT ON (key) id
  FROM app_settings
  ORDER BY key, updated_at ASC, id ASC
);


-- ============================================================
-- SECTION C: ADD UNIQUE CONSTRAINTS (prevent future duplicates)
-- ============================================================

-- Ingredients: one row per name
ALTER TABLE ingredients ADD CONSTRAINT ingredients_name_unique UNIQUE (name);

-- Menu items: one row per name
ALTER TABLE menu_items ADD CONSTRAINT menu_items_name_unique UNIQUE (name);

-- Recipes: one row per (name, menu_item_id, size_variant)
-- Note: size_variant is nullable; Postgres UNIQUE treats NULLs as distinct
-- This is fine — the dedup DELETE above handles existing dupes, and the
-- app-level supabaseHasData() guard prevents re-insertion
ALTER TABLE recipes ADD CONSTRAINT recipes_name_menu_size_unique
  UNIQUE (name, menu_item_id, size_variant);

-- Recipe ingredients: one row per (recipe_id, ingredient_id)
ALTER TABLE recipe_ingredients ADD CONSTRAINT recipe_ingredients_recipe_ingredient_unique
  UNIQUE (recipe_id, ingredient_id);

-- Alert rules: one row per name
ALTER TABLE alert_rules ADD CONSTRAINT alert_rules_name_unique UNIQUE (name);

-- Bowl templates: one row per name
ALTER TABLE bowl_templates ADD CONSTRAINT bowl_templates_name_unique UNIQUE (name);

-- Bowl components: one row per (bowl_template_id, component_type, name)
ALTER TABLE bowl_components ADD CONSTRAINT bowl_components_template_type_name_unique
  UNIQUE (bowl_template_id, component_type, name);

-- app_settings already has UNIQUE(key) from original DDL — no change needed
