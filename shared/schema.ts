import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  organization: text("organization"),
  role: text("role").notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const dataExtractions = pgTable("data_extractions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  dataSource: text("data_source").notNull(),
  status: text("status").notNull().default("pending"),
  configuration: text("configuration").notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const extractionConfigurations = pgTable("extraction_configurations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  dataSource: text("data_source").notNull(),
  patientCriteria: text("patient_criteria").notNull(),
  format: text("format").notNull(),
  includePhí: boolean("include_phi").notNull().default(false),
  anonymize: boolean("anonymize").notNull().default(true),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dataSystems = pgTable("data_systems", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const dataSources = pgTable("data_sources", {
  id: serial("id").primaryKey(),
  dataSystemId: integer("data_system_id").references(() => dataSystems.id).notNull(),
  name: text("name").notNull().unique(),
  description: text("description"),
  filename: text("filename").notNull(),
  activeFlag: boolean("active_flag").default(true).notNull(),
  isMaster: boolean("is_master").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const dataSourceAttributes = pgTable("data_source_attributes", {
  id: serial("id").primaryKey(),
  dataSourceId: integer("data_source_id").references(() => dataSources.id).notNull(),
  name: text("name").notNull(),
  dataType: text("data_type"), // string, number, date
  format: text("format"), // e.g., MM/DD/YYYY
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const crossReferences = pgTable("cross_references", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  dataSystemId: integer("data_system_id").references(() => dataSystems.id).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const crossReferenceMappings = pgTable("cross_reference_mappings", {
  id: serial("id").primaryKey(),
  crossReferenceId: integer("cross_reference_id").references(() => crossReferences.id).notNull(),
  sourceDataSourceId: integer("source_data_source_id").references(() => dataSources.id).notNull(),
  sourceAttributeId: integer("source_attribute_id").references(() => dataSourceAttributes.id).notNull(),
  targetDataSourceId: integer("target_data_source_id").references(() => dataSources.id).notNull(),
  targetAttributeId: integer("target_attribute_id").references(() => dataSourceAttributes.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const srcmCanonical = pgTable("srcm_canonical", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  dataType: text("data_type"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const dataMappings = pgTable("data_mappings", {
  id: serial("id").primaryKey(),
  dataSystemId: integer("data_system_id").references(() => dataSystems.id).notNull(),
  srcmCanonicalId: integer("srcm_canonical_id").references(() => srcmCanonical.id).notNull(),
  primaryDataSourceId: integer("primary_data_source_id").references(() => dataSources.id),
  primaryAttributeId: integer("primary_attribute_id").references(() => dataSourceAttributes.id),
  secondaryDataSourceId: integer("secondary_data_source_id").references(() => dataSources.id),
  secondaryAttributeId: integer("secondary_attribute_id").references(() => dataSourceAttributes.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const filterConditions = pgTable("filter_conditions", {
  id: serial("id").primaryKey(),
  dataSystemId: integer("data_system_id").references(() => dataSystems.id).notNull(),
  name: text("name").notNull().unique(),
  dataSourceId: integer("data_source_id").references(() => dataSources.id).notNull(),
  attributeId: integer("attribute_id").references(() => dataSourceAttributes.id).notNull(),
  operator: text("operator").notNull(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const createUserSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const updateUserPasswordSchema = z.object({
  userId: z.number(),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const insertDataExtractionSchema = createInsertSchema(dataExtractions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExtractionConfigurationSchema = createInsertSchema(extractionConfigurations).omit({
  id: true,
  createdAt: true,
});

export const insertDataSystemSchema = createInsertSchema(dataSystems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDataSourceSchema = createInsertSchema(dataSources).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDataSourceAttributeSchema = createInsertSchema(dataSourceAttributes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCrossReferenceSchema = createInsertSchema(crossReferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCrossReferenceMappingSchema = createInsertSchema(crossReferenceMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSrcmCanonicalSchema = createInsertSchema(srcmCanonical).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDataMappingSchema = createInsertSchema(dataMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFilterConditionSchema = createInsertSchema(filterConditions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;
export type CreateUserRequest = z.infer<typeof createUserSchema>;
export type UpdateUserPasswordRequest = z.infer<typeof updateUserPasswordSchema>;
export type InsertDataExtraction = z.infer<typeof insertDataExtractionSchema>;
export type DataExtraction = typeof dataExtractions.$inferSelect;
export type InsertExtractionConfiguration = z.infer<typeof insertExtractionConfigurationSchema>;
export type ExtractionConfiguration = typeof extractionConfigurations.$inferSelect;
export type InsertDataSystem = z.infer<typeof insertDataSystemSchema>;
export type DataSystem = typeof dataSystems.$inferSelect;
export type InsertDataSource = z.infer<typeof insertDataSourceSchema>;
export type DataSource = typeof dataSources.$inferSelect;
export type InsertDataSourceAttribute = z.infer<typeof insertDataSourceAttributeSchema>;
export type DataSourceAttribute = typeof dataSourceAttributes.$inferSelect;
export type InsertCrossReference = z.infer<typeof insertCrossReferenceSchema>;
export type CrossReference = typeof crossReferences.$inferSelect;
export type InsertCrossReferenceMapping = z.infer<typeof insertCrossReferenceMappingSchema>;
export type CrossReferenceMapping = typeof crossReferenceMappings.$inferSelect;
export type InsertSrcmCanonical = z.infer<typeof insertSrcmCanonicalSchema>;
export type SrcmCanonical = typeof srcmCanonical.$inferSelect;
export type InsertDataMapping = z.infer<typeof insertDataMappingSchema>;
export type DataMapping = typeof dataMappings.$inferSelect;
export type InsertFilterCondition = z.infer<typeof insertFilterConditionSchema>;
export type FilterCondition = typeof filterConditions.$inferSelect;
