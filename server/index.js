import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import prisma from "./prisma.js";

// Import routes
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import requestRoutes from "./routes/requests.js";
import orderRoutes from "./routes/orders.js";
import cartRoutes from "./routes/cart.js";
import wishlistRoutes from "./routes/wishlist.js";
import messageRoutes from "./routes/messages.js";
import notificationRoutes from "./routes/notifications.js";
import paymentRoutes from "./routes/payments.js";
import adminRoutes from "./routes/admin.js";

// Import services
import { paymentReleaseService } from "./services/paymentReleaseService.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (one level up from server directory)
const envPath = path.join(__dirname, '..', '.env');
console.log('Looking for .env file at:', envPath);
console.log('File exists:', fs.existsSync(envPath));

dotenv.config({ path: envPath });

// Debug: Check if DATABASE_URL is loaded
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Found' : 'NOT FOUND');
console.log('All env vars:', Object.keys(process.env).filter(key => key.includes('DATABASE') || key.includes('API') || key.includes('SECRET')));

// Test database connection and start server only after connection
async function startServer() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    // Ensure required columns exist (idempotent)
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspended" BOOLEAN NOT NULL DEFAULT false');
    } catch (migrateErr) {
      console.warn('Migration check failed or already applied:', migrateErr?.message || migrateErr);
    }
    
    const app = express();
    const server = createServer(app);

    // Initialize Socket.IO
    const io = new Server(server, {
      cors: {
        origin: [
          process.env.NEXT_PUBLIC_CLIENT_URL || "http://localhost:3000",
          "http://localhost:3001",
          "http://localhost:3000"
        ],
        methods: ["GET", "POST"]
      }
    });

    // Configure multer for file uploads
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    });

    const upload = multer({ storage });

    // Middleware
    app.use(cors({
      origin: [
        process.env.NEXT_PUBLIC_CLIENT_URL || "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3000"
      ],
      credentials: true
    }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Serve uploaded files
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    // Use routes
    app.use('/api/auth', authRoutes);
    app.use('/api/products', productRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/cart', cartRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/payments', paymentRoutes);
    app.use('/api/wishlist', wishlistRoutes);
    app.use('/api/messages', messageRoutes);
    app.use('/api/requests', requestRoutes);
    app.use('/api/notifications', notificationRoutes);

    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({ status: 'OK', message: 'CampusKart API is running' });
    });

    // Socket.IO connection handling
    io.on('connection', (socket) => {
      console.log('User connected:', socket.id);
      
      socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room: ${roomId}`);
      });
      
      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({ error: 'Something went wrong!' });
    });

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, () => {
      console.log(`🚀 CampusKart Server running on port ${PORT}`);
      console.log(`📱 Frontend URL: ${process.env.NEXT_PUBLIC_CLIENT_URL || 'http://localhost:3000'}`);
      console.log(`🔌 Socket.IO enabled`);
      
      // Start automatic payment release service
      paymentReleaseService.start();
      console.log(`💰 Automatic payment release service started`);
    });
    
    // Export for use in other modules
    global.io = io;
    global.prisma = prisma;
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('Server will not start without database connection');
    process.exit(1);
  }
}

// Start the server
startServer();

export { prisma }; 