import { users, dataExtractions, extractionConfigurations, type User, type InsertUser, type DataExtraction, type InsertDataExtraction, type ExtractionConfiguration, type InsertExtractionConfiguration } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(id: number, hashedPassword: string): Promise<void>;
  
  // User management methods
  getAllUsers(): Promise<User[]>;
  updateUserPasswordById(userId: number, hashedPassword: string): Promise<void>;
  updateUserStatus(userId: number, isActive: boolean): Promise<void>;
  
  // Data extraction methods
  getDataExtractions(userId: number): Promise<DataExtraction[]>;
  getDataExtraction(id: number): Promise<DataExtraction | undefined>;
  createDataExtraction(extraction: InsertDataExtraction): Promise<DataExtraction>;
  updateDataExtractionStatus(id: number, status: string): Promise<void>;
  
  // Configuration methods
  getExtractionConfigurations(userId: number): Promise<ExtractionConfiguration[]>;
  createExtractionConfiguration(config: InsertExtractionConfiguration): Promise<ExtractionConfiguration>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Trim role to prevent whitespace issues
    const cleanUser = {
      ...insertUser,
      role: insertUser.role?.trim() || 'user'
    };
    
    const [user] = await db
      .insert(users)
      .values(cleanUser)
      .returning();
    return user;
  }

  async updateUserPassword(id: number, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserPasswordById(userId: number, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updateUserStatus(userId: number, isActive: boolean): Promise<void> {
    await db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async getDataExtractions(userId: number): Promise<DataExtraction[]> {
    return await db
      .select()
      .from(dataExtractions)
      .where(eq(dataExtractions.userId, userId))
      .orderBy(desc(dataExtractions.createdAt));
  }

  async getDataExtraction(id: number): Promise<DataExtraction | undefined> {
    const [extraction] = await db
      .select()
      .from(dataExtractions)
      .where(eq(dataExtractions.id, id));
    return extraction || undefined;
  }

  async createDataExtraction(extraction: InsertDataExtraction): Promise<DataExtraction> {
    const [newExtraction] = await db
      .insert(dataExtractions)
      .values(extraction)
      .returning();
    return newExtraction;
  }

  async updateDataExtractionStatus(id: number, status: string): Promise<void> {
    await db
      .update(dataExtractions)
      .set({ status, updatedAt: new Date() })
      .where(eq(dataExtractions.id, id));
  }

  async getExtractionConfigurations(userId: number): Promise<ExtractionConfiguration[]> {
    return await db
      .select()
      .from(extractionConfigurations)
      .where(eq(extractionConfigurations.userId, userId))
      .orderBy(desc(extractionConfigurations.createdAt));
  }

  async createExtractionConfiguration(config: InsertExtractionConfiguration): Promise<ExtractionConfiguration> {
    const [newConfig] = await db
      .insert(extractionConfigurations)
      .values(config)
      .returning();
    return newConfig;
  }
}

export const storage = new DatabaseStorage();
