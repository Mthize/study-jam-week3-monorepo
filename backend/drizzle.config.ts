import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import { join } from 'node:path';
import { buildConnectionStringFromEnv } from './src/database/utils/connection-string';

dotenv.config({ path: join(__dirname, '.env') });

const databaseUrl = buildConnectionStringFromEnv(process.env);

export default defineConfig({
  out: './drizzle',
  schema: './src/database/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
});
