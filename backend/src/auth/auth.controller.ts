import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GitHubOAuthGuard } from './guards/github-oauth.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import type { OAuthProfile } from './types/oauth.types';
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  async googleCallback(
    @Req() req: Request & { user?: OAuthProfile },
    @Res() res: Response,
    @Query('state') state?: string,
  ) {
    const redirectUrl = await this.authService.handleOAuthCallback(req.user, state);
    return res.redirect(redirectUrl);
  }

  @Get('github')
  @UseGuards(GitHubOAuthGuard)
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  githubAuth() {}

  @Get('github/callback')
  @UseGuards(GitHubOAuthGuard)
  async githubCallback(
    @Req() req: Request & { user?: OAuthProfile },
    @Res() res: Response,
    @Query('state') state?: string,
  ) {
    const redirectUrl = await this.authService.handleOAuthCallback(req.user, state);
    return res.redirect(redirectUrl);
  }
}
