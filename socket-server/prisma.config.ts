import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  // Point to the app's shared migrations to avoid drift
  migrations: {
    path: '../Skill Swap/prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'] as string,
  },
});
