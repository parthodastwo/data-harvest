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
