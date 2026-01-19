import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Prevent multiple instances in development
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function createPrismaClient(): PrismaClient {
  // Create a PostgreSQL connection pool with very conservative limits
  // Supabase free tier has limited connections (~10-15)
  // Using transaction pooler (port 6543) is recommended for production
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2, // Keep very low for serverless - each Vercel function gets its own pool
    min: 0, // Allow pool to shrink to 0 when idle
    idleTimeoutMillis: 10000, // Close idle connections after 10 seconds
    connectionTimeoutMillis: 15000, // Wait up to 15 seconds for a connection
    allowExitOnIdle: true, // Allow process to exit when pool is idle
  });

  // Handle pool errors gracefully
  pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
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
