import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { getOAuthProviderStatuses, type OAuthProviderStatus } from './auth/oauth-config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const allowedOrigins = Array.from(
    new Set(
      [process.env.FRONTEND_URL, ...(process.env.FRONTEND_ORIGINS ?? '').split(',')]
        .map((origin) => origin?.trim())
        .filter((origin): origin is string => Boolean(origin)),
    ),
  );

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();

  const configService = app.get(ConfigService);
  const providerStatuses = getOAuthProviderStatuses(configService);
  logProviderStatus(logger, providerStatuses.google);
  logProviderStatus(logger, providerStatuses.github);

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`Backend is running on port ${port}`);
}

function logProviderStatus(logger: Logger, status: OAuthProviderStatus) {
  if (status.enabled) {
    logger.log(`${status.label} OAuth configured: yes`);
  } else {
    const missing = status.missingKeys.join(', ') || 'No variables provided';
    logger.warn(`${status.label} OAuth configured: no (missing: ${missing})`);
  }
}
bootstrap();
