import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { loginSchema, registerSchema, changePasswordSchema, createUserSchema, updateUserPasswordSchema, insertDataExtractionSchema, insertExtractionConfigurationSchema, type User } from "@shared/schema";
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

  const httpServer = createServer(app);
  return httpServer;
}
