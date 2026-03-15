import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { compare, hash } from 'bcryptjs';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { users } from '../database/schema';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { decodeOAuthState } from './oauth-state';
import type { OAuthProfile } from './types/oauth.types';

type User = typeof users.$inferSelect;
type UserInsert = typeof users.$inferInsert;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const existingUser = await this.db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      throw new BadRequestException('Email is already registered.');
    }

    const passwordHash = await hash(dto.password, 12);

    const [created] = await this.db
      .insert(users)
      .values({
        name: dto.name,
        surname: dto.surname,
        email,
        passwordHash,
        authProvider: 'local',
      })
      .returning();

    return this.buildAuthResponse(created);
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('This account is linked to an OAuth provider.');
    }

    const passwordValid = await compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    return this.buildAuthResponse(user);
  }

  async handleOAuthCallback(profile: OAuthProfile | undefined, state?: string) {
    const redirectBase = this.resolveRedirectUrl(state);

    if (!profile) {
      return this.buildRedirectUrl(redirectBase, {
        oauth: 'error',
        message: 'OAuth profile was not provided. Please try again.',
      });
    }

    try {
      const authResponse = await this.handleOAuthLogin(profile);
      return this.buildRedirectUrl(redirectBase, {
        oauth: 'success',
        provider: profile.provider,
        token: authResponse.data.token,
      });
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : 'OAuth login failed.';
      return this.buildRedirectUrl(redirectBase, {
        oauth: 'error',
        message,
      });
    }
  }

  private async handleOAuthLogin(profile: OAuthProfile) {
    if (!profile.providerId) {
      throw new BadRequestException('OAuth provider payload is missing an id.');
    }

    const email = profile.email?.toLowerCase();
    if (!email) {
      throw new BadRequestException('The provider did not share an email address.');
    }

    let user = await this.db.query.users.findFirst({
      where: and(eq(users.authProvider, profile.provider), eq(users.providerId, profile.providerId)),
    });

    if (!user) {
      user = await this.db.query.users.findFirst({
        where: eq(users.email, email),
      });
    }

    if (user) {
      const updates: Partial<UserInsert> = {};
      if (user.authProvider !== profile.provider) {
        updates.authProvider = profile.provider;
      }
      if (user.providerId !== profile.providerId) {
        updates.providerId = profile.providerId;
      }
      if (profile.avatarUrl && user.avatarUrl !== profile.avatarUrl) {
        updates.avatarUrl = profile.avatarUrl;
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date();
        [user] = await this.db
          .update(users)
          .set(updates)
          .where(eq(users.id, user.id))
          .returning();
      }

      return this.buildAuthResponse(user);
    }

    const [created] = await this.db
      .insert(users)
      .values({
        name: profile.name ?? 'New',
        surname: profile.surname ?? 'User',
        email,
        passwordHash: null,
        authProvider: profile.provider,
        providerId: profile.providerId,
        avatarUrl: profile.avatarUrl,
      })
      .returning();

    return this.buildAuthResponse(created);
  }

  private buildAuthResponse(user: User) {
    const token = this.jwtService.sign({ sub: user.id, email: user.email });

    return {
      status: 'success',
      data: {
        user: this.toUserResponse(user),
        token,
      },
    };
  }

  private toUserResponse(user: User) {
    return {
      id: user.id,
      name: user.name,
      surname: user.surname,
      email: user.email,
      authProvider: user.authProvider,
      avatarUrl: user.avatarUrl ?? undefined,
      createdAt: user.createdAt?.toISOString(),
      updatedAt: user.updatedAt?.toISOString(),
    };
  }

  private resolveRedirectUrl(state?: string) {
    const decoded = decodeOAuthState(state);
    const requested = decoded?.redirectUrl;
    if (requested && this.isAllowedRedirect(requested)) {
      return requested;
    }

    return this.getDefaultFrontendUrl();
  }

  private getDefaultFrontendUrl() {
    const configured = this.configService.get<string>('FRONTEND_URL');
    if (configured) {
      return configured;
    }

    const origins = this.getAllowedOrigins();
    if (origins.length > 0) {
      return origins[0];
    }

    return 'http://localhost:5173';
  }

  private getAllowedOrigins() {
    const origins = (this.configService.get<string>('FRONTEND_ORIGINS') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    const configured = this.configService.get<string>('FRONTEND_URL');
    if (configured) {
      try {
        origins.unshift(new URL(configured).origin);
      } catch {
        origins.unshift(configured);
      }
    }

    return Array.from(new Set(origins));
  }

  private isAllowedRedirect(candidate: string) {
    try {
      const parsed = new URL(candidate);
      return this.getAllowedOrigins().includes(parsed.origin);
    } catch {
      return false;
    }
  }

  private buildRedirectUrl(baseUrl: string, params: Record<string, string | undefined>) {
    const url = new URL(baseUrl);
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }

    return url.toString();
  }
}
