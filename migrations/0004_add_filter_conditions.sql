
-- Migration to add filter_conditions table

CREATE TABLE IF NOT EXISTS "filter_conditions" (
	"id" serial PRIMARY KEY NOT NULL,
	"data_system_id" integer NOT NULL,
	"name" text NOT NULL,
	"data_source_id" integer NOT NULL,
	"attribute_id" integer NOT NULL,
	"operator" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "filter_conditions_name_unique" UNIQUE("name")
);

DO $$ BEGIN
 ALTER TABLE "filter_conditions" ADD CONSTRAINT "filter_conditions_data_system_id_data_systems_id_fk" FOREIGN KEY ("data_system_id") REFERENCES "data_systems"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "filter_conditions" ADD CONSTRAINT "filter_conditions_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "data_sources"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "filter_conditions" ADD CONSTRAINT "filter_conditions_attribute_id_data_source_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "data_source_attributes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
