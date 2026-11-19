/*
# KaFarmers AI — expenses + farm settings (single-tenant, no auth)

1. New Tables
- `farm_settings`: singleton row (id = 1) holding farm setup: farm_name, total_hectares, crop_type, expected_yield_kg, farmgate_price_per_kg.
- `expenses`: expense ledger rows: description, amount (PHP), plot_name, expense_date, category (Seeds, Fertilizer, Pesticide, Labor, Fuel & Irrigation), source ('manual' | 'ai' | 'sample').
2. Security
- Enable RLS on both tables.
- Grant SELECT/INSERT/UPDATE/DELETE to anon + authenticated (no sign-in screen; data is intentionally shared).
- 4 separate policies per table, TO anon, authenticated.
3. Data
- Seed the singleton farm settings row (Isabela Valley Estate defaults).
- Seed 4 sample Philippine rice farm expenses only if the table is empty.
4. Notes
- All statements idempotent; safe to re-run.
*/

CREATE TABLE IF NOT EXISTS farm_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  farm_name text NOT NULL DEFAULT 'Isabela Valley Estate',
  total_hectares numeric NOT NULL DEFAULT 3.5,
  crop_type text NOT NULL DEFAULT 'Irrigated Rice',
  expected_yield_kg numeric NOT NULL DEFAULT 18000,
  farmgate_price_per_kg numeric NOT NULL DEFAULT 21,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  plot_name text NOT NULL DEFAULT '',
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL CHECK (category IN ('Seeds', 'Fertilizer', 'Pesticide', 'Labor', 'Fuel & Irrigation')),
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE farm_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON farm_settings TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON expenses TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_farm_settings" ON farm_settings;
CREATE POLICY "public_read_farm_settings" ON farm_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_farm_settings" ON farm_settings;
CREATE POLICY "public_insert_farm_settings" ON farm_settings
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_farm_settings" ON farm_settings;
CREATE POLICY "public_update_farm_settings" ON farm_settings
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_farm_settings" ON farm_settings;
CREATE POLICY "public_delete_farm_settings" ON farm_settings
  FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_read_expenses" ON expenses;
CREATE POLICY "public_read_expenses" ON expenses
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_expenses" ON expenses;
CREATE POLICY "public_insert_expenses" ON expenses
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_expenses" ON expenses;
CREATE POLICY "public_update_expenses" ON expenses
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_expenses" ON expenses;
CREATE POLICY "public_delete_expenses" ON expenses
  FOR DELETE TO anon, authenticated USING (true);

INSERT INTO farm_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

INSERT INTO expenses (description, amount, plot_name, expense_date, category, source)
SELECT * FROM (VALUES
  ('Certified hybrid rice seeds - 6 bags (SL-8H)', 10800, 'Plot A - North Field', DATE '2026-06-08', 'Seeds', 'sample'),
  ('Complete fertilizer 14-14-14 (15 bags) + urea topdress', 28500, 'Plot A - North Field', DATE '2026-06-20', 'Fertilizer', 'sample'),
  ('Hand tractor rental for land preparation and rotavation', 7500, 'Plot B - Riverside', DATE '2026-06-05', 'Fuel & Irrigation', 'sample'),
  ('Planting labor crew - 12 workers for transplanting', 14400, 'Plot A - North Field', DATE '2026-06-15', 'Labor', 'sample')
) AS seed(description, amount, plot_name, expense_date, category, source)
WHERE NOT EXISTS (SELECT 1 FROM expenses);
