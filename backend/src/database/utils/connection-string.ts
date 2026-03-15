interface LoggerLike {
  log?(message: string): void;
  error?(message: string): void;
}

const encode = (value: string) => encodeURIComponent(value);

function log(logger: LoggerLike | undefined, message: string) {
  if (logger?.log) {
    logger.log(message);
  }
}

function error(logger: LoggerLike | undefined, message: string) {
  if (logger?.error) {
    logger.error(message);
  }
}

export function buildConnectionStringFromEnv(
  env: Record<string, string | undefined>,
  logger?: LoggerLike,
) {
  const directUrl = env.DATABASE_URL;
  if (directUrl) {
    return directUrl;
  }

  const dbName = env.DB_NAME;
  const dbUser = env.DB_USER;
  const dbPassword = env.DB_PASSWORD;

  if (!dbName || !dbUser || !dbPassword) {
    error(logger, 'Database configuration missing. Provide DATABASE_URL or DB_* variables.');
    throw new Error(
      'Startup failed: Provide DATABASE_URL or DB_NAME, DB_USER, DB_PASSWORD, and host details.',
    );
  }

  const instanceConnectionName = env.DB_INSTANCE_CONNECTION_NAME;
  if (instanceConnectionName) {
    const socketPath = env.DB_SOCKET_PATH ?? '/cloudsql';
    const socketHost = `${socketPath}/${instanceConnectionName}`;
    log(logger, 'Building PostgreSQL connection string using Cloud SQL socket path.');
    return `postgresql://${encode(dbUser)}:${encode(dbPassword)}@/${dbName}?host=${encode(socketHost)}`;
  }

  const dbHost = env.DB_HOST;
  const dbPort = env.DB_PORT ?? '5432';

  if (!dbHost) {
    error(logger, 'DB_HOST is required when not using Cloud SQL sockets.');
    throw new Error(
      'Startup failed: Provide DATABASE_URL or DB_HOST/DB_PORT along with DB_NAME, DB_USER, DB_PASSWORD.',
    );
  }

  return `postgresql://${encode(dbUser)}:${encode(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;
}
