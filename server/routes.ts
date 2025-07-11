import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { parse } from "csv-parse";
import { stringify } from "csv-stringify";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { loginSchema, registerSchema, changePasswordSchema, createUserSchema, updateUserPasswordSchema, insertDataExtractionSchema, insertExtractionConfigurationSchema, insertDataSystemSchema, insertDataSourceSchema, insertDataSourceAttributeSchema, insertCrossReferenceSchema, insertCrossReferenceMappingSchema, insertSrcmCanonicalSchema, insertDataMappingSchema, insertFilterConditionSchema, type User } from "@shared/schema";
import { z } from "zod";

// Extend Express Request interface to include user
interface AuthenticatedRequest extends Request {
  user: User;
}

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const SALT_ROUNDS = 10;

// Middleware to verify JWT token
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, SALT_ROUNDS);

      // Create user
      const user = await storage.createUser({
        username: validatedData.username,
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        organization: validatedData.organization,
        role: validatedData.role || "user",
        isActive: true
      });

      // Generate JWT token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);

      // Find user
      const user = await storage.getUserByUsername(validatedData.username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(validatedData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      if (!user.isActive) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Generate JWT token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      console.error("Login error:", error);
      res.status(401).json({ message: "Invalid username or password" });
    }
  });

  app.post("/api/auth/change-password", authenticateToken, async (req: any, res) => {
    try {
      const validatedData = changePasswordSchema.parse(req.body);
      const user = req.user;

      // Verify current password
      const isValidPassword = await bcrypt.compare(validatedData.currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(validatedData.newPassword, SALT_ROUNDS);

      // Update password
      await storage.updateUserPassword(user.id, hashedPassword);

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Change password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
    const { password: _, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });

  // Data extraction routes
  app.get("/api/extractions", authenticateToken, async (req: any, res) => {
    try {
      const extractions = await storage.getDataExtractions(req.user.id);
      res.json(extractions);
    } catch (error) {
      console.error("Get extractions error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/extractions", authenticateToken, async (req: any, res) => {
    try {
      const validatedData = insertDataExtractionSchema.parse({
        ...req.body,
        userId: req.user.id
      });

      const extraction = await storage.createDataExtraction(validatedData);
      res.json(extraction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Create extraction error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Configuration routes
  app.get("/api/configurations", authenticateToken, async (req: any, res) => {
    try {
      const configurations = await storage.getExtractionConfigurations(req.user.id);
      res.json(configurations);
    } catch (error) {
      console.error("Get configurations error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/configurations", authenticateToken, async (req: any, res) => {
    try {
      const validatedData = insertExtractionConfigurationSchema.parse({
        ...req.body,
        userId: req.user.id
      });

      const configuration = await storage.createExtractionConfiguration(validatedData);
      res.json(configuration);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Create configuration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User management routes (admin only)
  app.get("/api/users", authenticateToken, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      // Remove password from response
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/users", authenticateToken, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      console.log("Received user data:", req.body);
      const result = createUserSchema.safeParse(req.body);
      if (!result.success) {
        console.log("Validation errors:", result.error.errors);
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: result.error.errors 
        });
      }

      const { confirmPassword, ...userData } = result.data;
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      const { password: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error: any) {
      if (error.code === "23505") {
        return res.status(400).json({ message: "Username or email already exists" });
      }
      console.error("Create user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/users/:id/password", authenticateToken, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const result = updateUserPasswordSchema.safeParse({
        userId: parseInt(req.params.id),
        ...req.body
      });

      if (!result.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: result.error.errors 
        });
      }

      const { userId, newPassword } = result.data;
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await storage.updateUserPasswordById(userId, hashedPassword);
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Update user password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/users/:id/status", authenticateToken, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const userId = parseInt(req.params.id);
      const { isActive } = req.body;

      if (typeof isActive !== "boolean") {
        return res.status(400).json({ message: "isActive must be a boolean" });
      }

      await storage.updateUserStatus(userId, isActive);
      res.json({ message: "User status updated successfully" });
    } catch (error) {
      console.error("Update user status error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Data Systems API routes
  app.get("/api/data-systems", authenticateToken, async (req: any, res) => {
    try {
      const dataSystems = await storage.getAllDataSystems();
      res.json(dataSystems);
    } catch (error) {
      console.error("Get data systems error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/data-systems/:id", authenticateToken, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const dataSystem = await storage.getDataSystem(id);

      if (!dataSystem) {
        return res.status(404).json({ message: "Data system not found" });
      }

      res.json(dataSystem);
    } catch (error) {
      console.error("Get data system error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/data-systems", authenticateToken, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const result = insertDataSystemSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: result.error.errors 
        });
      }

      // Additional validation for required name field
      if (!result.data.name || result.data.name.trim() === "") {
        return res.status(400).json({ 
          message: "Name is required for creating data system" 
        });
      }

       // Check if data system name already exists
       const existingDataSystem = await storage.getDataSystemByName(result.data.name);
       if (existingDataSystem) {
         return res.status(400).json({ message: "Data System with this name already exists" });
       }

      const dataSystem = await storage.createDataSystem(result.data);
      res.status(201).json(dataSystem);
    } catch (error) {
      console.error("Create data system error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/data-systems/:id", authenticateToken, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      const result = insertDataSystemSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: result.error.errors 
        });
      }

      // Additional validation for required name field when updating
      if (result.data.name !== undefined && (!result.data.name || result.data.name.trim() === "")) {
        return res.status(400).json({ 
          message: "Name is required for data system" 
        });
      }

       // Check if data system name already exists, excluding the current data system
       if (result.data.name) {
        const existingDataSystem = await storage.getDataSystemByName(result.data.name);
        if (existingDataSystem && existingDataSystem.id !== id) {
          return res.status(400).json({ message: "Data System with this name already exists" });
        }
      }

      const dataSystem = await storage.updateDataSystem(id, result.data);
      res.json(dataSystem);
    } catch (error) {
      console.error("Update data system error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/data-systems/:id", authenticateToken, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);

      // Check if there are any data sources associated with this data system
      const associatedDataSources = await storage.getDataSourcesBySystem(id);
      if (associatedDataSources.length > 0) {
        return res.status(400).json({ 
          message: "This data system can not be deleted since data sources exists for this." 
        });
      }

      await storage.deleteDataSystem(id);
      res.json({ message: "Data system deleted successfully" });
    } catch (error) {
      console.error("Delete data system error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Data Sources API routes
  app.get("/api/data-sources", authenticateToken, async (req: any, res) => {
    try {
      const dataSources = await storage.getAllDataSources();
      res.json(dataSources);
    } catch (error) {
      console.error("Get data sources error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/data-systems/:systemId/data-sources", authenticateToken, async (req: any, res) => {
    try {
      const systemId = parseInt(req.params.systemId);
      const dataSources = await storage.getDataSourcesBySystem(systemId);
      res.json(dataSources);
    } catch (error) {
      console.error("Get data sources error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/data-sources/:id", authenticateToken, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const dataSource = await storage.getDataSource(id);

      if (!dataSource) {
        return res.status(404).json({ message: "Data source not found" });
      }

      res.json(dataSource);
    } catch (error) {
      console.error("Get data source error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/data-sources", authenticateToken, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const result = insertDataSourceSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: result.error.errors 
        });
      }

      // Additional validation for required fields
      if (!result.data.name || result.data.name.trim() === "") {
        return res.status(400).json({ 
          message: "Name is required for creating data source" 
        });
      }

      if (!result.data.filename || result.data.filename.trim() === "") {
        return res.status(400).json({ 
          message: "Filename is required for creating data source" 
        });
      }

      if (!result.data.dataSystemId || result.data.dataSystemId === 0) {
        return res.status(400).json({ 
          message: "Enter Data system for creating data source" 
        });
      }

      // Check if data source name already exists
      const existingDataSource = await storage.getDataSourceByName(result.data.name);
      if (existingDataSource) {
        return res.status(400).json({ message: "Data Source with this name already exists" });
      }

      const dataSource = await storage.createDataSource(result.data);
      res.status(201).json(dataSource);
    } catch (error) {
      console.error("Create data source error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/data-sources/:id", authenticateToken, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      const result = insertDataSourceSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: result.error.errors 
        });
      }

      // Additional validation for required fields when updating
      if (result.data.name !== undefined && (!result.data.name || result.data.name.trim() === "")) {
        return res.status(400).json({ 
          message: "Name is required for data source" 
        });
      }

      if (result.data.filename !== undefined && (!result.data.filename || result.data.filename.trim() === "")) {
        return res.status(400).json({ 
          message: "Filename is required for data source" 
        });
      }

      if (result.data.dataSystemId !== undefined && (!result.data.dataSystemId || result.data.dataSystemId === 0)) {
        return res.status(400).json({ 
          message: "Enter Data system for creating data source" 
        });
      }

      // Check if data source name already exists, excluding the current data source
      if (result.data.name) {
        const existingDataSource = await storage.getDataSourceByName(result.data.name);
        if (existingDataSource && existingDataSource.id !== id) {
          return res.status(400).json({ message: "Data Source with this name already exists" });
        }
      }

      const dataSource = await storage.updateDataSource(id, result.data);
      res.json(dataSource);
    } catch (error) {
      console.error("Update data source error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/data-sources/:id", authenticateToken, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);

      // Check if there are any attributes associated with this data source
      const associatedAttributes = await storage.getDataSourceAttributes(id);
      if (associatedAttributes.length > 0) {
        return res.status(400).json({ 
          message: "This Data source can not be deleted since it has attributes" 
        });
      }

      await storage.deleteDataSource(id);
      res.json({ message: "Data source deleted successfully" });
    } catch (error) {
      console.error("Delete data source error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Data Source Attributes API routes
  app.get("/api/data-sources/:sourceId/attributes", authenticateToken, async (req: any, res) => {
    try {
      const sourceId = parseInt(req.params.sourceId);
      const attributes = await storage.getDataSourceAttributes(sourceId);
      res.json(attributes);
    } catch (error) {
      console.error("Get data source attributes error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/data-sources/:sourceId/attributes", authenticateToken, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const sourceId = parseInt(req.params.sourceId);
      const attributeData = { ...req.body, dataSourceId: sourceId };

      const result = insertDataSourceAttributeSchema.safeParse(attributeData);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: result.error.errors 
        });
      }

      // Additional validation for required name field
      if (!result.data.name || result.data.name.trim() === "") {
        return res.status(400).json({ 
          message: "Name is required for data source attribute" 
        });
      }

      const attribute = await storage.createDataSourceAttribute(result.data);
      res.status(201).json(attribute);
    } catch (error) {
      console.error("Create data source attribute error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/data-source-attributes/:id", authenticateToken, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      const result = insertDataSourceAttributeSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: result.error.errors 
        });
      }

      // Additional validation for required name field when updating
      if (result.data.name !== undefined && (!result.data.name || result.data.name.trim() === "")) {
        return res.status(400).json({ 
          message: "Name is required for data source attribute" 
        });
      }

      const attribute = await storage.updateDataSourceAttribute(id, result.data);
      res.json(attribute);
    } catch (error) {
      console.error("Update data source attribute error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/data-source-attributes/:id", authenticateToken, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      await storage.deleteDataSourceAttribute(id);
      res.json({ message: "Data source attribute deleted successfully" });
    } catch (error) {
      console.error("Delete data source attribute error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Cross Reference routes
  app.get("/api/cross-references", authenticateToken, async (req, res) => {
    try {
      const crossReferences = await storage.getAllCrossReferences();
      res.json(crossReferences);
    } catch (error) {
      console.error("Get cross references error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/cross-references/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const crossReference = await storage.getCrossReference(id);
      if (!crossReference) {
        return res.status(404).json({ message: "Cross reference not found" });
      }
      res.json(crossReference);
    } catch (error) {
      console.error("Get cross reference error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/cross-references", authenticateToken, async (req, res) => {
    try {
      const crossReferenceData = insertCrossReferenceSchema.parse(req.body);
      
      // Check if cross reference name already exists
      const existingCrossReference = await storage.getCrossReferenceByName(crossReferenceData.name);
      if (existingCrossReference) {
        return res.status(400).json({ message: "This cross reference already exists, use a different name" });
      }
      
      const crossReference = await storage.createCrossReference(crossReferenceData);
      res.json(crossReference);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Create cross reference error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/cross-references/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const crossReferenceData = insertCrossReferenceSchema.partial().parse(req.body);
      
      // Check if cross reference name already exists, excluding the current cross reference
      if (crossReferenceData.name) {
        const existingCrossReference = await storage.getCrossReferenceByName(crossReferenceData.name);
        if (existingCrossReference && existingCrossReference.id !== id) {
          return res.status(400).json({ message: "This cross reference already exists, use a different name" });
        }
      }
      
      const crossReference = await storage.updateCrossReference(id, crossReferenceData);
      res.json(crossReference);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Update cross reference error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/cross-references/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Check if there are any mappings associated with this cross reference
      const associatedMappings = await storage.getCrossReferenceMappings(id);
      if (associatedMappings.length > 0) {
        return res.status(400).json({ 
          message: "This cross reference can not be deleted since it has mappings" 
        });
      }

      await storage.deleteCrossReference(id);
      res.json({ message: "Cross reference deleted successfully" });
    } catch (error) {
      console.error("Delete cross reference error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Cross Reference Mapping routes
  app.get("/api/cross-references/:id/mappings", authenticateToken, async (req, res) => {
    try {
      const crossReferenceId = parseInt(req.params.id);
      const mappings = await storage.getCrossReferenceMappings(crossReferenceId);
      res.json(mappings);
    } catch (error) {
      console.error("Get cross reference mappings error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/cross-references/:id/mappings", authenticateToken, async (req, res) => {
    try {
      const crossReferenceId = parseInt(req.params.id);
      const mappingData = insertCrossReferenceMappingSchema.parse({
        ...req.body,
        crossReferenceId
      });
      const mapping = await storage.createCrossReferenceMapping(mappingData);
      res.json(mapping);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Create cross reference mapping error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/cross-references/:id/mappings/:mappingId", authenticateToken, async (req, res) => {
    try {
      const mappingId = parseInt(req.params.mappingId);
      const mappingData = insertCrossReferenceMappingSchema.partial().parse(req.body);
      const mapping = await storage.updateCrossReferenceMapping(mappingId, mappingData);
      res.json(mapping);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Update cross reference mapping error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/cross-references/:id/mappings/:mappingId", authenticateToken, async (req, res) => {
    try {
      const mappingId = parseInt(req.params.mappingId);
      await storage.deleteCrossReferenceMapping(mappingId);
      res.json({ message: "Cross reference mapping deleted successfully" });
    } catch (error) {
      console.error("Delete cross reference mapping error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Configure multer for file uploads
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}-${file.originalname}`);
      }
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
        cb(null, true);
      } else {
        cb(new Error('Only CSV files are allowed'));
      }
    },
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    }
  });

  // In-memory storage for file mappings (in production, this should be in database)
  const fileMapping = new Map<number, string>(); // dataSourceId -> filename

  // Data Extraction file upload endpoint
  app.post("/api/data-extraction/upload", authenticateToken, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const dataSourceId = parseInt(req.body.dataSourceId);
      if (!dataSourceId) {
        return res.status(400).json({ message: "Data source ID is required" });
      }

      // Verify the data source exists
      const dataSource = await storage.getDataSource(dataSourceId);
      if (!dataSource) {
        return res.status(404).json({ message: "Data source not found" });
      }

      // Store file mapping for later retrieval
      fileMapping.set(dataSourceId, req.file.filename);

      // Store file info (you can extend this to store in database if needed)
      const fileInfo = {
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        dataSourceId: dataSourceId,
        uploadedAt: new Date(),
        uploadedBy: req.user.id
      };

      console.log("File uploaded:", fileInfo);
      console.log("File mapping updated:", Array.from(fileMapping.entries()));

      res.json({ 
        message: "File uploaded successfully",
        file: {
          originalName: req.file.originalname,
          size: req.file.size,
          dataSourceId: dataSourceId
        }
      });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ message: "File upload failed" });
    }
  });

  // Data Extraction processing endpoint
  app.post("/api/data-extraction/extract", authenticateToken, async (req: any, res) => {
    try {
      const { dataSystemId } = req.body;

      if (!dataSystemId) {
        return res.status(400).json({ message: "Data system ID is required" });
      }

      // Get all data sources for this data system
      const dataSources = await storage.getDataSourcesBySystem(dataSystemId);
      const masterDataSources = dataSources.filter(ds => ds.activeFlag && ds.isMaster);

      if (masterDataSources.length === 0) {
        return res.status(400).json({ message: "No master data sources found" });
      }

      // Get all SRCM canonical attributes
      const srcmCanonicalAttributes = await storage.getAllSrcmCanonical();
      if (srcmCanonicalAttributes.length === 0) {
        return res.status(400).json({ message: "No SRCM canonical attributes found" });
      }

      // Get all data mappings for this data system
      const dataMappings = await storage.getDataMappingsBySystem(dataSystemId);

      // Get all cross references
      const crossReferences = await storage.getAllCrossReferences();

      // Process each master data source
      const extractedData: any[] = [];

      for (const masterDataSource of masterDataSources) {
        // Find the uploaded file for this master data source using file mapping
        const masterFileName = fileMapping.get(masterDataSource.id);

        if (!masterFileName) {
          console.log(`No uploaded file found for master data source: ${masterDataSource.name}`);
          continue;
        }

        // Read master CSV data
        const masterFilePath = path.join(uploadDir, masterFileName);
        const masterCsvResult = await readCSVFile(masterFilePath);
        const masterCsvData = masterCsvResult.data;
        const masterCsvColumns = masterCsvResult.columns;

        if (masterCsvData.length === 0) {
          console.log(`No data found in master file: ${masterFileName}`);
          continue;
        }

        // Get master data source attributes
        const masterAttributes = await storage.getDataSourceAttributes(masterDataSource.id);

        // Load reference data into memory for efficient lookup
        const referenceDataCache = new Map<number, { data: any[], attributes: any[] }>();
        
        for (const dataSource of dataSources) {
          if (!dataSource.activeFlag || dataSource.isMaster) continue;
          
          const referenceFileName = fileMapping.get(dataSource.id);
          if (referenceFileName) {
            const referenceFilePath = path.join(uploadDir, referenceFileName);
            const referenceCsvResult = await readCSVFile(referenceFilePath);
            const referenceAttributes = await storage.getDataSourceAttributes(dataSource.id);
            
            referenceDataCache.set(dataSource.id, {
              data: referenceCsvResult.data,
              attributes: referenceAttributes
            });
          }
        }

        // Process each row in master data
        for (const masterRow of masterCsvData) {
          const outputRow: any = {};

          // Loop through all SRCM canonical attributes
          for (const canonicalAttr of srcmCanonicalAttributes) {
            // Check if there's a mapping for this canonical attribute in this data system
            const mapping = dataMappings.find(m => m.srcmCanonicalId === canonicalAttr.id);

            if (!mapping) {
              // No mapping exists, create column with empty value
              outputRow[canonicalAttr.name] = '';
              console.log(`No mapping found for canonical attribute: ${canonicalAttr.name}`);
            } else {
              // Mapping exists, try to get value from primary data source first
              let value = '';
              
              // Try primary data source/attribute first
              if (mapping.primaryDataSourceId && mapping.primaryAttributeId) {
                value = await getAttributeValue(mapping.primaryDataSourceId, mapping.primaryAttributeId, masterDataSource, masterRow, masterAttributes, referenceDataCache, crossReferences, dataSystemId);
              }
              
              // If primary value is empty, try secondary data source/attribute
              if (!value && mapping.secondaryDataSourceId && mapping.secondaryAttributeId) {
                value = await getAttributeValue(mapping.secondaryDataSourceId, mapping.secondaryAttributeId, masterDataSource, masterRow, masterAttributes, referenceDataCache, crossReferences, dataSystemId);
              }

              outputRow[canonicalAttr.name] = value;
              console.log(`Mapped canonical attribute: ${canonicalAttr.name} = ${value}`);
            }
          }

          extractedData.push(outputRow);
        }
      }

      if (extractedData.length === 0) {
        return res.status(400).json({ message: "No data extracted" });
      }

      // Generate CSV output with canonical attribute names as columns
      const csvOutput = await generateCSVOutput(extractedData);

      // Set response headers for file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="extracted_data_${new Date().toISOString().split('T')[0]}.csv"`);

      res.send(csvOutput);

    } catch (error) {
      console.error("Data extraction error:", error);
      res.status(500).json({ message: "Data extraction failed" });
    }
  });

  // Helper function to get attribute value from data source
  async function getAttributeValue(
    sourceDataSourceId: number, 
    sourceAttributeId: number, 
    masterDataSource: any, 
    masterRow: any, 
    masterAttributes: any[], 
    referenceDataCache: Map<number, { data: any[], attributes: any[] }>, 
    crossReferences: any[], 
    dataSystemId: number
  ): Promise<string> {
    let value = '';

    // Check if the mapping points to the master data source
    if (sourceDataSourceId === masterDataSource.id) {
      const sourceAttr = masterAttributes.find(attr => attr.id === sourceAttributeId);
      if (sourceAttr && masterRow[sourceAttr.name] !== undefined) {
        const rawValue = masterRow[sourceAttr.name] || '';
        value = formatAttributeValue(rawValue, sourceAttr);
      }
    } else {
      // Check reference data sources
      const referenceData = referenceDataCache.get(sourceDataSourceId);
      if (referenceData) {
        const sourceAttr = referenceData.attributes.find(attr => attr.id === sourceAttributeId);
        
        if (sourceAttr) {
          // Find matching record using cross-reference mappings
          const relevantCrossRefs = crossReferences.filter(cr => cr.dataSystemId === dataSystemId);
          
          for (const crossRef of relevantCrossRefs) {
            const crossRefMappings = await storage.getCrossReferenceMappings(crossRef.id);
            
            for (const crossRefMapping of crossRefMappings) {
              // Check if this cross-reference links master to the reference data source
              if (crossRefMapping.sourceDataSourceId === masterDataSource.id && 
                  crossRefMapping.targetDataSourceId === sourceDataSourceId) {
                
                const masterLinkAttr = masterAttributes.find(attr => attr.id === crossRefMapping.sourceAttributeId);
                const referenceLinkAttr = referenceData.attributes.find(attr => attr.id === crossRefMapping.targetAttributeId);
                
                if (masterLinkAttr && referenceLinkAttr) {
                  const masterLinkValue = masterRow[masterLinkAttr.name];
                  const matchingReferenceRow = referenceData.data.find(refRow => 
                    refRow[referenceLinkAttr.name] === masterLinkValue
                  );
                  
                  if (matchingReferenceRow && matchingReferenceRow[sourceAttr.name] !== undefined) {
                    const rawValue = matchingReferenceRow[sourceAttr.name] || '';
                    value = formatAttributeValue(rawValue, sourceAttr);
                    break;
                  }
                }
              }
            }
            
            if (value) break;
          }
        }
      }
    }

    return value;
  }

  // Helper function to format attribute values based on their format
  function formatAttributeValue(value: string, attribute: any): string {
    if (!value || !value.trim()) {
      return '';
    }

    const trimmedValue = value.trim();

    // If no format specified, return as-is
    if (!attribute.format || !attribute.dataType) {
      return trimmedValue;
    }

    // Handle date formatting
    if (attribute.dataType === 'date' && attribute.format) {
      try {
        const date = parseDate(trimmedValue);
        if (date) {
          return formatDate(date, attribute.format);
        }
      } catch (error) {
        console.log(`Error formatting date value "${trimmedValue}" with format "${attribute.format}":`, error);
      }
    }

    // For other data types, return as-is for now
    return trimmedValue;
  }

  // Helper function to parse date from various input formats
  function parseDate(dateString: string): Date | null {

   
    if (!dateString) return null;

    // Month abbreviation mapping
    const monthMap: { [key: string]: number } = {
        "JAN": 0,
        "FEB": 1,
        "MAR": 2,
        "APR": 3,
        "MAY": 4,
        "JUN": 5,
        "JUL": 6,
        "AUG": 7,
        "SEP": 8,
        "OCT": 9,
        "NOV": 10,
        "DEC": 11,
    };
  
    // Try common date formats
    const formats = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,  // MM/DD/YYYY or M/D/YYYY
      /^(\d{4})-(\d{2})-(\d{2})$/,        // YYYY-MM-DD
      /^(\d{2})-(\d{2})-(\d{4})$/,        // MM-DD-YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/,    // M-D-YYYY
       /^(\d{1,2})-([A-Z,a-z]{3})-(\d{4})$/    // DD-MON-YYYY
    ];


    // Try DD-MON-YYYY format
    const ddMonYyyy = dateString.match(/^(\d{1,2})-([A-Z,a-z]{3})-(\d{4})$/);
    if (ddMonYyyy) {
      const day = parseInt(ddMonYyyy[1]);
      const monthAbbr = ddMonYyyy[2].toUpperCase();
      const year = parseInt(ddMonYyyy[3]);
      const month = monthMap[monthAbbr];
      return month !== undefined ? new Date(year, month, day) : null; // Return null if month is invalid
    }
    
    // Try MM/DD/YYYY format
    const mmddyyyy = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mmddyyyy) {
      const month = parseInt(mmddyyyy[1]) - 1; // JS months are 0-based
      const day = parseInt(mmddyyyy[2]);
      const year = parseInt(mmddyyyy[3]);
      return new Date(year, month, day);
    }

    // Try YYYY-MM-DD format
    const yyyymmdd = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (yyyymmdd) {
      const year = parseInt(yyyymmdd[1]);
      const month = parseInt(yyyymmdd[2]) - 1;
      const day = parseInt(yyyymmdd[3]);
      return new Date(year, month, day);
    }

    // Try MM-DD-YYYY format
    const mmddyyyy2 = dateString.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (mmddyyyy2) {
      const month = parseInt(mmddyyyy2[1]) - 1;
      const day = parseInt(mmddyyyy2[2]);
      const year = parseInt(mmddyyyy2[3]);
      return new Date(year, month, day);
    }

    return null;
  }

  // Helper function to format date according to specified format
  function formatDate(date: Date, format: string): string {
    const day = date.getDate();
    const month = date.getMonth() + 1; // JS months are 0-based
    const year = date.getFullYear();

    const padZero = (num: number, length: number = 2): string => {
      return num.toString().padStart(length, '0');
    };

    switch (format.toUpperCase()) {
      case 'DD/MM/YYYY':
        return `${padZero(day)}/${padZero(month)}/${year}`;
      case 'MM/DD/YYYY':
        return `${padZero(month)}/${padZero(day)}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${padZero(month)}-${padZero(day)}`;
      case 'MM-DD-YYYY':
        return `${padZero(month)}-${padZero(day)}-${year}`;
      case 'DD-MM-YYYY':
        return `${padZero(day)}-${padZero(month)}-${year}`;
      case 'M/D/YYYY':
        return `${month}/${day}/${year}`;
      case 'D/M/YYYY':
        return `${day}/${month}/${year}`;
      default:
        // If format not recognized, return as MM/DD/YYYY
        return `${padZero(month)}/${padZero(day)}/${year}`;
    }
  }

  // Helper function to read CSV file with column order preservation
  async function readCSVFile(filePath: string): Promise<{ data: any[], columns: string[] }> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      let columnOrder: string[] = [];

      fs.createReadStream(filePath)
        .pipe(parse({
          columns: (headers) => {
            columnOrder = headers;
            return headers;
          },
          skip_empty_lines: true,
          trim: true
        }))
        .on('data', (data) => results.push(data))
        .on('end', () => resolve({ data: results, columns: columnOrder }))
        .on('error', reject);
    });
  }

  // Helper function to generate CSV output
  async function generateCSVOutput(data: any[]): Promise<string> {
    return new Promise((resolve, reject) => {
      if (data.length === 0) {
        resolve('');
        return;
      }

      // Use the column order as defined in the first row (which was pre-ordered)
      const columnsInOrder = Object.keys(data[0]);

      stringify(data, {
        header: true,
        columns: columnsInOrder
      }, (err, output) => {
        if (err) reject(err);
        else resolve(output);
      });
    });
  }

  // SRCM Canonical routes
  app.get("/api/srcm-canonical", authenticateToken, async (req, res) => {
    try {
      const srcmCanonicals = await storage.getAllSrcmCanonical();
      res.json(srcmCanonicals);
    } catch (error) {
      console.error("Get SRCM canonical error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/srcm-canonical", authenticateToken, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const srcmCanonicalData = insertSrcmCanonicalSchema.parse(req.body);
      const srcmCanonical = await storage.createSrcmCanonical(srcmCanonicalData);
      res.json(srcmCanonical);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Create SRCM canonical error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Data Mapping routes
  app.get("/api/data-systems/:systemId/data-mappings", authenticateToken, async (req, res) => {
    try {
      const systemId = parseInt(req.params.systemId);
      const mappings = await storage.getDataMappingsBySystem(systemId);
      res.json(mappings);
    } catch (error) {
      console.error("Get data mappings error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/data-mappings", authenticateToken, async (req, res) => {
    try {
      const mappingData = insertDataMappingSchema.parse(req.body);
      const mapping = await storage.createDataMapping(mappingData);
      res.json(mapping);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Create data mapping error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/data-mappings/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const mappingData = insertDataMappingSchema.partial().parse(req.body);
      const mapping = await storage.updateDataMapping(id, mappingData);
      res.json(mapping);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Update data mapping error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/data-mappings/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDataMapping(id);
      res.json({ message: "Data mapping deleted successfully" });
    } catch (error) {
      console.error("Delete data mapping error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Filter Conditions routes
  app.get("/api/filter-conditions", authenticateToken, async (req, res) => {
    try {
      const filterConditions = await storage.getAllFilterConditions();
      res.json(filterConditions);
    } catch (error) {
      console.error("Get filter conditions error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/filter-conditions/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const filterCondition = await storage.getFilterCondition(id);
      if (!filterCondition) {
        return res.status(404).json({ message: "Filter condition not found" });
      }
      res.json(filterCondition);
    } catch (error) {
      console.error("Get filter condition error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/filter-conditions", authenticateToken, async (req, res) => {
    try {
      const filterConditionData = insertFilterConditionSchema.parse(req.body);
      
      // Check if filter condition name already exists
      const existingFilterCondition = await storage.getFilterConditionByName(filterConditionData.name);
      if (existingFilterCondition) {
        return res.status(400).json({ message: "Filter condition with this name already exists" });
      }
      
      const filterCondition = await storage.createFilterCondition(filterConditionData);
      res.json(filterCondition);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Create filter condition error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/filter-conditions/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const filterConditionData = insertFilterConditionSchema.partial().parse(req.body);
      
      // Check if filter condition name already exists, excluding the current filter condition
      if (filterConditionData.name) {
        const existingFilterCondition = await storage.getFilterConditionByName(filterConditionData.name);
        if (existingFilterCondition && existingFilterCondition.id !== id) {
          return res.status(400).json({ message: "Filter condition with this name already exists" });
        }
      }
      
      const filterCondition = await storage.updateFilterCondition(id, filterConditionData);
      res.json(filterCondition);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Update filter condition error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/filter-conditions/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteFilterCondition(id);
      res.json({ message: "Filter condition deleted successfully" });
    } catch (error) {
      console.error("Delete filter condition error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}