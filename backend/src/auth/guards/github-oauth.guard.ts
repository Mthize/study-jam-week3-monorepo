import { ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { encodeOAuthState } from '../oauth-state';

@Injectable()
export class GitHubOAuthGuard extends AuthGuard('github') {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('GitHub OAuth is not configured.');
    }
    return super.canActivate(context);
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const redirect = typeof request.query.redirect === 'string' ? request.query.redirect : undefined;
    const state = encodeOAuthState({ redirectUrl: redirect });
    return state ? { state } : undefined;
  }

  private isConfigured() {
    return (
      !!this.configService.get<string>('GITHUB_CLIENT_ID') &&
      !!this.configService.get<string>('GITHUB_CLIENT_SECRET') &&
      !!this.configService.get<string>('GITHUB_CALLBACK_URL')
    );
  }
}
