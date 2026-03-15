import { Logger, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE_CONNECTION');

function encode(value: string) {
  return encodeURIComponent(value);
}

function buildConnectionString(configService: ConfigService, logger: Logger) {
  const directUrl = configService.get<string>('DATABASE_URL');
  if (directUrl) {
    return directUrl;
  }

  const dbName = configService.get<string>('DB_NAME');
  const dbUser = configService.get<string>('DB_USER');
  const dbPassword = configService.get<string>('DB_PASSWORD');

  if (!dbName || !dbUser || !dbPassword) {
    logger.error('Database configuration missing. Provide DATABASE_URL or DB_* variables.');
    throw new Error(
      'Startup failed: Provide DATABASE_URL or DB_NAME, DB_USER, DB_PASSWORD, and host details.',
    );
  }

  const instanceConnectionName = configService.get<string>('DB_INSTANCE_CONNECTION_NAME');
  if (instanceConnectionName) {
    const socketPath = configService.get<string>('DB_SOCKET_PATH') ?? '/cloudsql';
    const socketHost = `${socketPath}/${instanceConnectionName}`;
    logger.log('Building PostgreSQL connection string using Cloud SQL socket path.');
    return `postgresql://${encode(dbUser)}:${encode(dbPassword)}@/${dbName}?host=${encode(socketHost)}`;
  }

  const dbHost = configService.get<string>('DB_HOST');
  const dbPort = configService.get<string>('DB_PORT') ?? '5432';

  if (!dbHost) {
    logger.error('DB_HOST is required when not using Cloud SQL sockets.');
    throw new Error(
      'Startup failed: Provide DATABASE_URL or DB_HOST/DB_PORT along with DB_NAME, DB_USER, DB_PASSWORD.',
    );
  }

  return `postgresql://${encode(dbUser)}:${encode(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;
}

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: Pool,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('DatabaseModule');
        const connectionString = buildConnectionString(configService, logger);

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
