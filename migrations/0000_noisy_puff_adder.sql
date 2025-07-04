CREATE TABLE "cross_reference_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"cross_reference_id" integer NOT NULL,
	"source_data_source_id" integer NOT NULL,
	"source_attribute_id" integer NOT NULL,
	"target_data_source_id" integer NOT NULL,
	"target_attribute_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cross_references" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"data_system_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_extractions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"data_source" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"configuration" text NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"data_system_id" integer NOT NULL,
	"srcm_canonical_id" integer NOT NULL,
	"source_data_source_id" integer,
	"source_attribute_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_source_attributes" (
	"id" serial PRIMARY KEY NOT NULL,
	"data_source_id" integer NOT NULL,
	"name" text NOT NULL,
	"data_type" text,
	"format" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"data_system_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"filename" text NOT NULL,
	"active_flag" boolean DEFAULT true NOT NULL,
	"is_master" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "data_sources_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "data_systems" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "data_systems_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "extraction_configurations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"data_source" text NOT NULL,
	"patient_criteria" text NOT NULL,
	"format" text NOT NULL,
	"include_phi" boolean DEFAULT false NOT NULL,
	"anonymize" boolean DEFAULT true NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "srcm_canonical" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"data_type" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"organization" text,
	"role" text DEFAULT 'user' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "cross_reference_mappings" ADD CONSTRAINT "cross_reference_mappings_cross_reference_id_cross_references_id_fk" FOREIGN KEY ("cross_reference_id") REFERENCES "public"."cross_references"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_reference_mappings" ADD CONSTRAINT "cross_reference_mappings_source_data_source_id_data_sources_id_fk" FOREIGN KEY ("source_data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_reference_mappings" ADD CONSTRAINT "cross_reference_mappings_source_attribute_id_data_source_attributes_id_fk" FOREIGN KEY ("source_attribute_id") REFERENCES "public"."data_source_attributes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_reference_mappings" ADD CONSTRAINT "cross_reference_mappings_target_data_source_id_data_sources_id_fk" FOREIGN KEY ("target_data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_reference_mappings" ADD CONSTRAINT "cross_reference_mappings_target_attribute_id_data_source_attributes_id_fk" FOREIGN KEY ("target_attribute_id") REFERENCES "public"."data_source_attributes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_references" ADD CONSTRAINT "cross_references_data_system_id_data_systems_id_fk" FOREIGN KEY ("data_system_id") REFERENCES "public"."data_systems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_extractions" ADD CONSTRAINT "data_extractions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_mappings" ADD CONSTRAINT "data_mappings_data_system_id_data_systems_id_fk" FOREIGN KEY ("data_system_id") REFERENCES "public"."data_systems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_mappings" ADD CONSTRAINT "data_mappings_srcm_canonical_id_srcm_canonical_id_fk" FOREIGN KEY ("srcm_canonical_id") REFERENCES "public"."srcm_canonical"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_mappings" ADD CONSTRAINT "data_mappings_source_data_source_id_data_sources_id_fk" FOREIGN KEY ("source_data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_mappings" ADD CONSTRAINT "data_mappings_source_attribute_id_data_source_attributes_id_fk" FOREIGN KEY ("source_attribute_id") REFERENCES "public"."data_source_attributes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_source_attributes" ADD CONSTRAINT "data_source_attributes_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_data_system_id_data_systems_id_fk" FOREIGN KEY ("data_system_id") REFERENCES "public"."data_systems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_configurations" ADD CONSTRAINT "extraction_configurations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;