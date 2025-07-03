import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { loginSchema, registerSchema, changePasswordSchema, createUserSchema, updateUserPasswordSchema, insertDataExtractionSchema, insertExtractionConfigurationSchema, insertDataSystemSchema, insertDataSourceSchema, insertDataSourceAttributeSchema, type User } from "@shared/schema";
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
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(validatedData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.isActive) {
        return res.status(401).json({ message: "Account is disabled" });
      }

      // Generate JWT token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
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

  const httpServer = createServer(app);
  return httpServer;
}
