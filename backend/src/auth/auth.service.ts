import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { compare, hash } from 'bcryptjs';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { users } from '../database/schema';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

type User = typeof users.$inferSelect;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    private readonly jwtService: JwtService,
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

    const passwordValid = await compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    return this.buildAuthResponse(user);
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
      createdAt: user.createdAt?.toISOString(),
      updatedAt: user.updatedAt?.toISOString(),
    };
  }
}
