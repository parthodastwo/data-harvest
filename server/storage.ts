import { db } from "./db";
import { 
  users, 
  dataExtractions, 
  extractionConfigurations, 
  dataSystems, 
  dataSources, 
  dataSourceAttributes, 
  crossReferences, 
  crossReferenceMappings, 
  srcmCanonical, 
  dataMappings,
  filterConditions,
  type User, 
  type InsertUser, 
  type DataExtraction, 
  type InsertDataExtraction, 
  type ExtractionConfiguration, 
  type InsertExtractionConfiguration, 
  type DataSystem, 
  type InsertDataSystem, 
  type DataSource, 
  type InsertDataSource, 
  type DataSourceAttribute, 
  type InsertDataSourceAttribute, 
  type CrossReference, 
  type InsertCrossReference, 
  type CrossReferenceMapping, 
  type InsertCrossReferenceMapping, 
  type SrcmCanonical, 
  type InsertSrcmCanonical, 
  type DataMapping, 
  type InsertDataMapping,
  type FilterCondition,
  type InsertFilterCondition
} from "@shared/schema";
import { alias } from "drizzle-orm/pg-core";
import { eq, desc, and } from "drizzle-orm";

// Create aliases for multiple joins on the same table
const primaryDataSource = alias(dataSources, 'primaryDataSource');
const secondaryDataSource = alias(dataSources, 'secondaryDataSource');
const primaryDataSourceAttributes = alias(dataSourceAttributes, 'primaryDataSourceAttributes');
const secondaryDataSourceAttributes = alias(dataSourceAttributes, 'secondaryDataSourceAttributes');

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

  // Data System methods
  getAllDataSystems(): Promise<DataSystem[]>;
  getDataSystem(id: number): Promise<DataSystem | undefined>;
  getDataSystemByName(name: string): Promise<DataSystem | undefined>;
  createDataSystem(dataSystem: InsertDataSystem): Promise<DataSystem>;
  updateDataSystem(id: number, dataSystem: Partial<InsertDataSystem>): Promise<DataSystem>;
  deleteDataSystem(id: number): Promise<void>;

  // Data Source methods
  getAllDataSources(): Promise<DataSource[]>;
  getDataSourcesBySystem(dataSystemId: number): Promise<DataSource[]>;
  getDataSource(id: number): Promise<DataSource | undefined>;
  getDataSourceByName(name: string): Promise<DataSource | undefined>;
  createDataSource(dataSource: InsertDataSource): Promise<DataSource>;
  updateDataSource(id: number, dataSource: Partial<InsertDataSource>): Promise<DataSource>;
  deleteDataSource(id: number): Promise<void>;

  // Data Source Attribute methods
  getDataSourceAttributes(dataSourceId: number): Promise<DataSourceAttribute[]>;
  getDataSourceAttribute(id: number): Promise<DataSourceAttribute | undefined>;
  createDataSourceAttribute(attribute: InsertDataSourceAttribute): Promise<DataSourceAttribute>;
  updateDataSourceAttribute(id: number, attribute: Partial<InsertDataSourceAttribute>): Promise<DataSourceAttribute>;
  deleteDataSourceAttribute(id: number): Promise<void>;

  // Cross Reference methods
  getAllCrossReferences(): Promise<CrossReference[]>;
  getCrossReference(id: number): Promise<CrossReference | undefined>;
  createCrossReference(crossReference: InsertCrossReference): Promise<CrossReference>;
  updateCrossReference(id: number, crossReference: Partial<InsertCrossReference>): Promise<CrossReference>;
  deleteCrossReference(id: number): Promise<void>;

  // Cross Reference Mapping methods
  getCrossReferenceMappings(crossReferenceId: number): Promise<CrossReferenceMapping[]>;
  getCrossReferenceMapping(id: number): Promise<CrossReferenceMapping | undefined>;
  createCrossReferenceMapping(mapping: InsertCrossReferenceMapping): Promise<CrossReferenceMapping>;
  updateCrossReferenceMapping(id: number, mapping: Partial<InsertCrossReferenceMapping>): Promise<CrossReferenceMapping>;
  deleteCrossReferenceMapping(id: number): Promise<void>;

  // SRCM Canonical methods
  getAllSrcmCanonical(): Promise<SrcmCanonical[]>;
  getSrcmCanonical(id: number): Promise<SrcmCanonical | undefined>;
  createSrcmCanonical(data: InsertSrcmCanonical): Promise<SrcmCanonical>;
  updateSrcmCanonical(id: number, data: Partial<InsertSrcmCanonical>): Promise<SrcmCanonical>;
  deleteSrcmCanonical(id: number): Promise<void>;

  // Data Mappings methods
  getDataMappingsBySystem(dataSystemId: number): Promise<any[]>;
  createDataMapping(data: InsertDataMapping): Promise<DataMapping>;
  updateDataMapping(id: number, data: Partial<InsertDataMapping>): Promise<DataMapping>;
  deleteDataMapping(id: number): Promise<void>;
  getDataMappingBySrcmAndSystem(dataSystemId: number, srcmCanonicalId: number): Promise<DataMapping | undefined>;

  // Filter Conditions methods
  getAllFilterConditions(): Promise<FilterCondition[]>;
  getFilterCondition(id: number): Promise<FilterCondition | undefined>;
  getFilterConditionByName(name: string): Promise<FilterCondition | undefined>;
  createFilterCondition(data: InsertFilterCondition): Promise<FilterCondition>;
  updateFilterCondition(id: number, data: Partial<InsertFilterCondition>): Promise<FilterCondition>;
  deleteFilterCondition(id: number): Promise<void>;
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

  // Data System methods
  async getAllDataSystems(): Promise<DataSystem[]> {
    return await db.select().from(dataSystems).orderBy(desc(dataSystems.createdAt));
  }

  async getDataSystem(id: number): Promise<DataSystem | undefined> {
    const [dataSystem] = await db.select().from(dataSystems).where(eq(dataSystems.id, id));
    return dataSystem || undefined;
  }

  async getDataSystemByName(name: string): Promise<DataSystem | undefined> {
    const [dataSystem] = await db.select().from(dataSystems).where(eq(dataSystems.name, name));
    return dataSystem || undefined;
  }

  async createDataSystem(dataSystem: InsertDataSystem): Promise<DataSystem> {
    const [newDataSystem] = await db
      .insert(dataSystems)
      .values(dataSystem)
      .returning();
    return newDataSystem;
  }

  async updateDataSystem(id: number, dataSystem: Partial<InsertDataSystem>): Promise<DataSystem> {
    const [updatedDataSystem] = await db
      .update(dataSystems)
      .set({ ...dataSystem, updatedAt: new Date() })
      .where(eq(dataSystems.id, id))
      .returning();
    return updatedDataSystem;
  }

  async deleteDataSystem(id: number): Promise<void> {
    await db.delete(dataSystems).where(eq(dataSystems.id, id));
  }

  // Data Source methods
  async getAllDataSources(): Promise<DataSource[]> {
    return await db.select().from(dataSources).orderBy(desc(dataSources.createdAt));
  }

  async getDataSourcesBySystem(dataSystemId: number): Promise<DataSource[]> {
    return await db.select().from(dataSources).where(eq(dataSources.dataSystemId, dataSystemId)).orderBy(desc(dataSources.createdAt));
  }

  async getDataSource(id: number): Promise<DataSource | undefined> {
    const [dataSource] = await db.select().from(dataSources).where(eq(dataSources.id, id));
    return dataSource || undefined;
  }

  async getDataSourceByName(name: string): Promise<DataSource | undefined> {
    const [dataSource] = await db.select().from(dataSources).where(eq(dataSources.name, name));
    return dataSource || undefined;
  }

  async createDataSource(dataSource: InsertDataSource): Promise<DataSource> {
    const [newDataSource] = await db
      .insert(dataSources)
      .values(dataSource)
      .returning();
    return newDataSource;
  }

  async updateDataSource(id: number, dataSource: Partial<InsertDataSource>): Promise<DataSource> {
    const [updatedDataSource] = await db
      .update(dataSources)
      .set({ ...dataSource, updatedAt: new Date() })
      .where(eq(dataSources.id, id))
      .returning();
    return updatedDataSource;
  }

  async deleteDataSource(id: number): Promise<void> {
    await db.delete(dataSources).where(eq(dataSources.id, id));
  }

  // Data Source Attribute methods
  async getDataSourceAttributes(dataSourceId: number): Promise<DataSourceAttribute[]> {
    return await db.select().from(dataSourceAttributes).where(eq(dataSourceAttributes.dataSourceId, dataSourceId)).orderBy(desc(dataSourceAttributes.createdAt));
  }

  async getDataSourceAttribute(id: number): Promise<DataSourceAttribute | undefined> {
    const [attribute] = await db.select().from(dataSourceAttributes).where(eq(dataSourceAttributes.id, id));
    return attribute || undefined;
  }

  async createDataSourceAttribute(attribute: InsertDataSourceAttribute): Promise<DataSourceAttribute> {
    const [newAttribute] = await db
      .insert(dataSourceAttributes)
      .values(attribute)
      .returning();
    return newAttribute;
  }

  async updateDataSourceAttribute(id: number, attribute: Partial<InsertDataSourceAttribute>): Promise<DataSourceAttribute> {
    const [updatedAttribute] = await db
      .update(dataSourceAttributes)
      .set({ ...attribute, updatedAt: new Date() })
      .where(eq(dataSourceAttributes.id, id))
      .returning();
    return updatedAttribute;
  }

  async deleteDataSourceAttribute(id: number): Promise<void> {
    await db.delete(dataSourceAttributes).where(eq(dataSourceAttributes.id, id));
  }

  // Cross Reference methods
  async getAllCrossReferences(): Promise<CrossReference[]> {
    return await db.select().from(crossReferences).orderBy(desc(crossReferences.createdAt));
  }

  async getCrossReference(id: number): Promise<CrossReference | undefined> {
    const [crossReference] = await db.select().from(crossReferences).where(eq(crossReferences.id, id));
    return crossReference || undefined;
  }

  async getCrossReferenceByName(name: string): Promise<CrossReference | undefined> {
    const [crossReference] = await db.select().from(crossReferences).where(eq(crossReferences.name, name));
    return crossReference || undefined;
  }

  async createCrossReference(crossReference: InsertCrossReference): Promise<CrossReference> {
    const [newCrossReference] = await db
      .insert(crossReferences)
      .values(crossReference)
      .returning();
    return newCrossReference;
  }

  async updateCrossReference(id: number, crossReference: Partial<InsertCrossReference>): Promise<CrossReference> {
    const [updatedCrossReference] = await db
      .update(crossReferences)
      .set({ ...crossReference, updatedAt: new Date() })
      .where(eq(crossReferences.id, id))
      .returning();
    return updatedCrossReference;
  }

  async deleteCrossReference(id: number): Promise<void> {
    await db.delete(crossReferences).where(eq(crossReferences.id, id));
  }

  // Cross Reference Mapping methods
  async getCrossReferenceMappings(crossReferenceId: number): Promise<CrossReferenceMapping[]> {
    return await db.select().from(crossReferenceMappings).where(eq(crossReferenceMappings.crossReferenceId, crossReferenceId));
  }

  async getCrossReferenceMapping(id: number): Promise<CrossReferenceMapping | undefined> {
    const [mapping] = await db.select().from(crossReferenceMappings).where(eq(crossReferenceMappings.id, id));
    return mapping || undefined;
  }

  async createCrossReferenceMapping(mapping: InsertCrossReferenceMapping): Promise<CrossReferenceMapping> {
    const [newMapping] = await db
      .insert(crossReferenceMappings)
      .values(mapping)
      .returning();
    return newMapping;
  }

  async updateCrossReferenceMapping(id: number, mapping: Partial<InsertCrossReferenceMapping>): Promise<CrossReferenceMapping> {
    const [updatedMapping] = await db
      .update(crossReferenceMappings)
      .set({ ...mapping, updatedAt: new Date() })
      .where(eq(crossReferenceMappings.id, id))
      .returning();
    return updatedMapping;
  }

  async deleteCrossReferenceMapping(id: number): Promise<void> {
    await db.delete(crossReferenceMappings).where(eq(crossReferenceMappings.id, id));
  }

  // SRCM Canonical methods
  async getAllSrcmCanonical(): Promise<SrcmCanonical[]> {
    return await db.select().from(srcmCanonical).orderBy(srcmCanonical.id);
  }

  async getSrcmCanonical(id: number): Promise<SrcmCanonical | undefined> {
    const result = await db.select().from(srcmCanonical).where(eq(srcmCanonical.id, id));
    return result[0];
  }

  async createSrcmCanonical(data: InsertSrcmCanonical): Promise<SrcmCanonical> {
    const result = await db.insert(srcmCanonical).values(data).returning();
    return result[0];
  }

  async updateSrcmCanonical(id: number, data: Partial<InsertSrcmCanonical>): Promise<SrcmCanonical> {
    const result = await db.update(srcmCanonical).set({ ...data, updatedAt: new Date() }).where(eq(srcmCanonical.id, id)).returning();
    return result[0];
  }

  async deleteSrcmCanonical(id: number): Promise<void> {
    await db.delete(srcmCanonical).where(eq(srcmCanonical.id, id));
  }

  // Data Mappings methods
  async getDataMappingsBySystem(dataSystemId: number): Promise<any[]> {
    return await db
      .select({
        id: dataMappings.id,
        dataSystemId: dataMappings.dataSystemId,
        srcmCanonicalId: dataMappings.srcmCanonicalId,
        srcmCanonicalName: srcmCanonical.name,
        primaryDataSourceId: dataMappings.primaryDataSourceId,
        primaryDataSourceName: primaryDataSource.name,
        primaryAttributeId: dataMappings.primaryAttributeId,
        primaryAttributeName: primaryDataSourceAttributes.name,
        secondaryDataSourceId: dataMappings.secondaryDataSourceId,
        secondaryDataSourceName: secondaryDataSource.name,
        secondaryAttributeId: dataMappings.secondaryAttributeId,
        secondaryAttributeName: secondaryDataSourceAttributes.name,
        createdAt: dataMappings.createdAt,
        updatedAt: dataMappings.updatedAt,
      })
      .from(dataMappings)
      .innerJoin(srcmCanonical, eq(dataMappings.srcmCanonicalId, srcmCanonical.id))
      .leftJoin(primaryDataSource, eq(dataMappings.primaryDataSourceId, primaryDataSource.id))
      .leftJoin(primaryDataSourceAttributes, eq(dataMappings.primaryAttributeId, primaryDataSourceAttributes.id))
      .leftJoin(secondaryDataSource, eq(dataMappings.secondaryDataSourceId, secondaryDataSource.id))
      .leftJoin(secondaryDataSourceAttributes, eq(dataMappings.secondaryAttributeId, secondaryDataSourceAttributes.id))
      .where(eq(dataMappings.dataSystemId, dataSystemId))
      .orderBy(srcmCanonical.name);
  }

  async createDataMapping(data: InsertDataMapping): Promise<DataMapping> {
    const result = await db.insert(dataMappings).values(data).returning();
    return result[0];
  }

  async updateDataMapping(id: number, data: Partial<InsertDataMapping>): Promise<DataMapping> {
    const result = await db.update(dataMappings).set({ ...data, updatedAt: new Date() }).where(eq(dataMappings.id, id)).returning();
    return result[0];
  }

  async deleteDataMapping(id: number): Promise<void> {
    await db.delete(dataMappings).where(eq(dataMappings.id, id));
  }

  // Filter Conditions methods
  async getAllFilterConditions(): Promise<FilterCondition[]> {
    return await db.select().from(filterConditions).orderBy(filterConditions.name);
  }

  async getFilterCondition(id: number): Promise<FilterCondition | undefined> {
    const result = await db.select().from(filterConditions).where(eq(filterConditions.id, id));
    return result[0];
  }

  async getFilterConditionByName(name: string): Promise<FilterCondition | undefined> {
    const result = await db.select().from(filterConditions).where(eq(filterConditions.name, name));
    return result[0];
  }

  async createFilterCondition(data: InsertFilterCondition): Promise<FilterCondition> {
    const result = await db.insert(filterConditions).values(data).returning();
    return result[0];
  }

  async updateFilterCondition(id: number, data: Partial<InsertFilterCondition>): Promise<FilterCondition> {
    const result = await db.update(filterConditions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(filterConditions.id, id))
      .returning();
    return result[0];
  }

  async deleteFilterCondition(id: number): Promise<void> {
    await db.delete(filterConditions).where(eq(filterConditions.id, id));
  }
}

export const storage = new DatabaseStorage();