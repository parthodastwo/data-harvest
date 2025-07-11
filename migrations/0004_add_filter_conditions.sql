
CREATE TABLE filter_conditions (
  id SERIAL PRIMARY KEY,
  data_system_id INTEGER NOT NULL REFERENCES data_systems(id),
  name TEXT NOT NULL UNIQUE,
  data_source_id INTEGER NOT NULL REFERENCES data_sources(id),
  attribute_id INTEGER NOT NULL REFERENCES data_source_attributes(id),
  operator TEXT NOT NULL CHECK (operator IN ('=', '>', '<')),
  value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
