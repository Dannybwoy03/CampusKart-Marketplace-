import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";
import { prisma } from "../index.js";
import { authenticateJWT } from "../middleware/auth.js";

const router = express.Router();

// Fix __dirname in ESM context for resolving upload paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Health for auth routes
router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Register new user
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate email verification token
    const verificationToken = jwt.sign(
      { email, type: 'email_verification' },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    // Create user (compute display letter on the fly, don't store)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "BUYER",
        isAdmin: false
      }
    });

    // Send verification email
    try {
      const { sendVerificationEmail } = await import('../utils/email.js');
      await sendVerificationEmail(email, name, verificationToken);
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Don't fail registration if email fails
    }

    const computedDisplay = name?.charAt(0)?.toUpperCase?.() || (email?.[0] || "?").toUpperCase();

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role, 
        isAdmin: user.isAdmin,
        name: user.name,
        displayName: computedDisplay
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "User created successfully. Please check your email to verify your account.",
      token,
      user: {
        userId: user.id,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin,
        name: user.name,
        displayName: computedDisplay
      }
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Login user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const computedDisplay = (user.name?.charAt(0)?.toUpperCase?.()) || (user.email?.[0] || "?").toUpperCase();

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role, 
        isAdmin: user.isAdmin,
        name: user.name,
        displayName: computedDisplay
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        userId: user.id,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin,
        name: user.name,
        displayName: computedDisplay
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Failed to login" });
  }
});

// Get current user info
router.get("/me", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isAdmin: true,
        createdAt: true,
        sellerProfile: {
          select: {
            storeName: true,
            contact: true,
            address: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const computedDisplay = (user.name?.charAt(0)?.toUpperCase?.()) || (user.email?.[0] || "?").toUpperCase();

    res.json({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin,
      displayName: computedDisplay,
      sellerProfile: user.sellerProfile
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to get user info" });
  }
});

// Become a seller
router.post("/become-seller", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { 
      storeName, 
      contact, 
      address, 
      paymentMethod,
      paymentDetails
    } = req.body;

    if (!storeName || !contact || !address || !paymentMethod) {
      return res.status(400).json({ error: "Store name, contact, address, and payment method are required" });
    }

    // Extract payment details based on selected method
    let mtnMomoNumber = null;
    let telecelCashNumber = null;
    let bankAccountNumber = null;
    let bankName = null;
    let bankAccountName = null;

    if (paymentMethod === "mtn" && paymentDetails?.mtnNumber) {
      mtnMomoNumber = paymentDetails.mtnNumber;
    } else if (paymentMethod === "telecel" && paymentDetails?.telecelNumber) {
      telecelCashNumber = paymentDetails.telecelNumber;
    } else if (paymentMethod === "bank" && paymentDetails?.bankName && paymentDetails?.accountNumber && paymentDetails?.accountName) {
      bankName = paymentDetails.bankName;
      bankAccountNumber = paymentDetails.accountNumber;
      bankAccountName = paymentDetails.accountName;
    } else {
      return res.status(400).json({ error: "Please provide valid payment details for the selected method" });
    }

    // Check if user is already a seller
    const existingProfile = await prisma.sellerProfile.findUnique({ where: { userId } });
    
    if (existingProfile) {
      // Update existing profile
      await prisma.sellerProfile.update({
        where: { userId },
        data: {
          storeName,
          contact,
          address,
          mtnMomoNumber,
          telecelCashNumber,
          bankAccountNumber,
          bankName,
          bankAccountName
        }
      });
    } else {
      // Create new profile
      await prisma.sellerProfile.create({
        data: {
          userId,
          storeName,
          contact,
          address,
          mtnMomoNumber,
          telecelCashNumber,
          bankAccountNumber,
          bankName,
          bankAccountName
        }
      });
    }

    // Update user role to SELLER (preserve admin status)
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: "SELLER" }
    });

    // Generate new JWT with updated role
    const newToken = jwt.sign(
      { 
        userId: updatedUser.id, 
        email: updatedUser.email, 
        role: updatedUser.role, 
        isAdmin: updatedUser.isAdmin,
        name: updatedUser.name,
        displayName: updatedUser.name.charAt(0).toUpperCase()
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.json({
      message: "Successfully registered as seller",
      token: newToken,
      user: {
        userId: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        isAdmin: updatedUser.isAdmin,
        name: updatedUser.name,
        displayName: updatedUser.name.charAt(0).toUpperCase()
      }
    });
  } catch (error) {
    console.error("Become seller error:", error);
    res.status(500).json({ error: "Failed to register as seller" });
  }
});

// Get notifications for the authenticated user
router.get("/notifications", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) return res.json([]);

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(notifications);
  } catch (error) {
    console.error("Notifications fetch error:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Mark a notification as read
router.post("/notifications/:id/read", authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Mark notification read error:", error);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

// Request password reset (minimal no-op for now)
router.post("/reset-password", async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "Email is required" });
  // In a full implementation, we'd generate a token and email it
  res.json({ message: "If an account exists, reset instructions have been sent" });
});

// Confirm password reset (minimal no-op for now)
router.post("/reset-password/confirm", async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword) {
    return res.status(400).json({ error: "Token and new password are required" });
  }
  // In a full implementation, we'd verify the token and update the user's password
  res.json({ message: "Password reset processed" });
});

// Update user profile
router.post("/profile", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, password } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const updateData = { name };
    
    // Hash new password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    const computedDisplay = (updatedUser.name?.charAt(0)?.toUpperCase?.()) || (updatedUser.email?.[0] || "?").toUpperCase();

    // Generate new JWT with updated info
    const newToken = jwt.sign(
      { 
        userId: updatedUser.id, 
        email: updatedUser.email, 
        role: updatedUser.role, 
        isAdmin: updatedUser.isAdmin,
        name: updatedUser.name,
        displayName: computedDisplay
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.json({
      message: "Profile updated successfully",
      token: newToken,
      user: {
        userId: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        isAdmin: updatedUser.isAdmin,
        name: updatedUser.name,
        displayName: computedDisplay
      }
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Upload profile avatar
router.post("/profile/avatar", authenticateJWT, (req, res) => {
  // Configure multer for this specific route
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, '..', 'uploads', 'avatars');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({ storage }).single('avatar');

  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: "File upload failed" });
    }

    try {
      const userId = req.user.userId;
      
      if (!req.file) {
        return res.status(400).json({ error: "Avatar file is required" });
      }

      const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl }
    });

    const computedDisplay = (updatedUser.name?.charAt(0)?.toUpperCase?.()) || (updatedUser.email?.[0] || "?").toUpperCase();

    // Generate new JWT with updated info
    const newToken = jwt.sign(
      { 
        userId: updatedUser.id, 
        email: updatedUser.email, 
        role: updatedUser.role, 
        isAdmin: updatedUser.isAdmin,
        name: updatedUser.name,
        displayName: computedDisplay,
        avatarUrl: updatedUser.avatarUrl
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

      res.json({
        message: "Avatar updated successfully",
        token: newToken,
        user: {
          userId: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          isAdmin: updatedUser.isAdmin,
          name: updatedUser.name,
          displayName: computedDisplay,
          avatarUrl: updatedUser.avatarUrl
        }
      });
    } catch (error) {
      console.error("Avatar upload error:", error);
      res.status(500).json({ error: "Failed to upload avatar" });
    }
  });
});

// Verify email
router.get("/verify-email/:token", async (req, res) => {
  try {
    const { token } = req.params;
    
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    
    if (decoded.type !== 'email_verification') {
      return res.status(400).json({ error: "Invalid verification token" });
    }

    // Update user as verified (you might want to add an emailVerified field to your schema)
    await prisma.user.update({
      where: { email: decoded.email },
      data: { /* emailVerified: true */ } // Add this field to your schema if needed
    });

    res.json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(400).json({ error: "Invalid or expired verification token" });
  }
});

export default router;