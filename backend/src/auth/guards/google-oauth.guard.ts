import { ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { encodeOAuthState, generateOAuthNonce } from '../oauth-state';

const NONCE_COOKIE_NAME = 'oauth_nonce';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('Google OAuth is not configured.');
    }
    return super.canActivate(context);
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const redirect = typeof request.query.redirect === 'string' ? request.query.redirect : undefined;
    
    if (redirect) {
      const nonce = generateOAuthNonce();
      response.cookie(NONCE_COOKIE_NAME, nonce, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600000,
      });
      const state = encodeOAuthState(redirect, nonce);
      return state ? { state, prompt: 'consent' } : { prompt: 'consent' };
    }
    
    return { prompt: 'consent' };
  }

  private isConfigured() {
    return (
      !!this.configService.get<string>('GOOGLE_CLIENT_ID') &&
      !!this.configService.get<string>('GOOGLE_CLIENT_SECRET') &&
      !!this.configService.get<string>('GOOGLE_CALLBACK_URL')
    );
  }
}
