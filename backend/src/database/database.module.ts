import { Logger, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE_CONNECTION');

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: Pool,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('DatabaseModule');
        const connectionString = configService.get<string>('DATABASE_URL');

        if (!connectionString) {
          logger.error('DATABASE_URL is required but was not provided.');
          throw new Error(
            'Startup failed: DATABASE_URL environment variable is required.',
          );
        }

        const pool = new Pool({ connectionString });
        try {
          await pool.query('select 1');
          logger.log('Successfully connected to PostgreSQL.');
        } catch (error) {
          await pool.end();
          logger.error(
            'Failed to connect to PostgreSQL. Please verify DATABASE_URL.',
            (error as Error).stack,
          );
          throw new Error(
            `Startup failed: unable to connect to PostgreSQL - ${(error as Error).message}`,
          );
        }

        return pool;
      },
    },
    {
      provide: DRIZZLE,
      inject: [Pool],
      useFactory: (pool: Pool) => drizzle(pool, { schema }),
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(private readonly pool: Pool) {}

  async onModuleDestroy() {
    await this.pool.end();
  }
}
