import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, "..", ".env");
dotenv.config({ path: envPath });

// Global Prisma instance to prevent multiple connections
let prisma;

// Configure Prisma for Supabase with proper connection settings
const prismaConfig = {
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: ['error', 'warn'],
};

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient(prismaConfig);
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient(prismaConfig);
  }
  prisma = global.__prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
