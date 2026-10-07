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