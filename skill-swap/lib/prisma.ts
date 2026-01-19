import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Prevent multiple instances in development
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function createPrismaClient(): PrismaClient {
  // Create a PostgreSQL connection pool with limited connections
  // Supabase free tier has limited connections, so we keep it small
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5, // Maximum number of connections in the pool
    min: 1, // Minimum number of connections
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
    connectionTimeoutMillis: 10000, // Timeout after 10 seconds if no connection available
  });

  // Store pool globally to prevent connection leaks
  globalForPrisma.pool = pool;

  // Create the Prisma adapter with the pool
  const adapter = new PrismaPg(pool);

  // Create and return the PrismaClient with the adapter
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
