import { Logger, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { buildConnectionStringFromEnv } from './utils/connection-string';

export const DRIZZLE = Symbol('DRIZZLE_CONNECTION');

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: Pool,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('DatabaseModule');
        const connectionString = buildConnectionStringFromEnv(
          {
            DATABASE_URL: configService.get<string>('DATABASE_URL'),
            DB_NAME: configService.get<string>('DB_NAME'),
            DB_USER: configService.get<string>('DB_USER'),
            DB_PASSWORD: configService.get<string>('DB_PASSWORD'),
            DB_INSTANCE_CONNECTION_NAME: configService.get<string>('DB_INSTANCE_CONNECTION_NAME'),
            DB_SOCKET_PATH: configService.get<string>('DB_SOCKET_PATH'),
            DB_HOST: configService.get<string>('DB_HOST'),
            DB_PORT: configService.get<string>('DB_PORT'),
          },
          logger,
        );

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
