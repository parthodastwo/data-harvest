
-- Migration to update data_mappings table to support primary and secondary mappings

-- Add new columns for primary and secondary mappings
ALTER TABLE data_mappings 
ADD COLUMN primary_data_source_id INTEGER REFERENCES data_sources(id),
ADD COLUMN primary_attribute_id INTEGER REFERENCES data_source_attributes(id),
ADD COLUMN secondary_data_source_id INTEGER REFERENCES data_sources(id),
ADD COLUMN secondary_attribute_id INTEGER REFERENCES data_source_attributes(id);

-- Migrate existing data from old columns to primary columns
UPDATE data_mappings 
SET primary_data_source_id = source_data_source_id,
    primary_attribute_id = source_attribute_id;

-- Drop old columns
ALTER TABLE data_mappings 
DROP COLUMN source_data_source_id,
DROP COLUMN source_attribute_id;
