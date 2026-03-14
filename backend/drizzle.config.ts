import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import { join } from 'node:path';

dotenv.config({ path: join(__dirname, '.env') });

export default defineConfig({
  out: './drizzle',
  schema: './src/database/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://user:password@localhost:5432/study_jam',
  },
});
