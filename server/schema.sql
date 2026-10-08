CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('cutting_supervisor', 'cutting_verifier', 'sewing_supervisor')),
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipes (
  id SERIAL PRIMARY KEY,
  recipe_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  std_fabric_yards NUMERIC(6, 2) NOT NULL CHECK (std_fabric_yards > 0),
  wastage_cap NUMERIC(5, 2) NOT NULL CHECK (wastage_cap >= 0)
);

CREATE TABLE IF NOT EXISTS recipe_components (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id),
  component_name TEXT NOT NULL,
  pieces_per_garment INTEGER NOT NULL CHECK (pieces_per_garment > 0),
  image_url TEXT,
  UNIQUE (recipe_id, component_name)
);


CREATE SEQUENCE IF NOT EXISTS cutting_order_no_seq;

CREATE TABLE IF NOT EXISTS cutting_orders (
  id SERIAL PRIMARY KEY,
  order_no TEXT NOT NULL UNIQUE
    DEFAULT 'CO-' || LPAD(NEXTVAL('cutting_order_no_seq')::TEXT, 4, '0'),
  recipe_id INTEGER NOT NULL REFERENCES recipes(id),
  target_qty INTEGER NOT NULL CHECK (target_qty > 0),
  fabric_roll_id TEXT NOT NULL CHECK (LENGTH(TRIM(fabric_roll_id)) > 0),
  actual_fabric_yds INTEGER NOT NULL CHECK (actual_fabric_yds > 0),
  expected_fabric_yds NUMERIC(10, 2) NOT NULL,
  wastage_cap NUMERIC(5, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'CUTTING_IN_PROGRESS' CHECK (status IN (
    'CUTTING_IN_PROGRESS',
    'PENDING_VERIFICATION',
    'REJECTED',
    'VERIFIED',
    'SEWING_IN_PROGRESS'
  )),
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cutting_orders_status ON cutting_orders(status);

CREATE TABLE IF NOT EXISTS verification_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES cutting_orders(id),
  component_id INTEGER NOT NULL REFERENCES recipe_components(id),
  expected_qty INTEGER NOT NULL CHECK (expected_qty > 0),
  actual_qty INTEGER CHECK (actual_qty >= 0),
  status TEXT CHECK (status IN ('GREEN', 'YELLOW', 'RED')),
  UNIQUE (order_id, component_id),
  CHECK ((actual_qty IS NULL) = (status IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_verification_items_order ON verification_items(order_id);


CREATE TABLE IF NOT EXISTS verification_logs (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES cutting_orders(id),
  verifier_id INTEGER NOT NULL REFERENCES users(id),
  decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED')),
  rejection_note TEXT,
  approval_note TEXT,
  wastage_pct NUMERIC(7, 2) NOT NULL,
  variance_snapshot JSONB NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (decision <> 'REJECTED' OR LENGTH(TRIM(COALESCE(rejection_note, ''))) >= 5)
);

CREATE INDEX IF NOT EXISTS idx_verification_logs_order ON verification_logs(order_id);

CREATE OR REPLACE FUNCTION block_log_changes() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Verification logs cannot be changed or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS verification_logs_locked ON verification_logs;
CREATE TRIGGER verification_logs_locked
  BEFORE UPDATE OR DELETE ON verification_logs
  FOR EACH ROW EXECUTE FUNCTION block_log_changes();

CREATE OR REPLACE FUNCTION block_verified_item_changes() RETURNS trigger AS $$
DECLARE
  order_status TEXT;
BEGIN
  SELECT status INTO order_status FROM cutting_orders WHERE id = OLD.order_id;

  IF order_status IN ('VERIFIED', 'SEWING_IN_PROGRESS') THEN
    RAISE EXCEPTION 'Counts are locked once an order is verified';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS verification_items_locked ON verification_items;
CREATE TRIGGER verification_items_locked
  BEFORE UPDATE OR DELETE ON verification_items
  FOR EACH ROW EXECUTE FUNCTION block_verified_item_changes();