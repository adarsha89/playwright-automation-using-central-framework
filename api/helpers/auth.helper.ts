import type { APIRequestContext } from '@playwright/test';
import { logger } from '@qe/base-js';
import { env } from '../../config/env';

interface AuthTokenResponse {
  token: string;
}

/**
 * Authenticates once and caches the resulting token for the lifetime of the
 * module (i.e. once per worker process, since Playwright workers are
 * separate processes). Wired in as a worker-scoped fixture in
 * `fixtures/index.ts` — no spec calls this directly or logs in by hand.
 *
 * App-specific (this app's own `/auth/login` endpoint) — not part of the
 * central `@qe/base-api-js` framework, which has no auth scheme of its own.
 */
export class AuthHelper {
  private cachedToken: string | undefined;

  constructor(private readonly request: APIRequestContext) {}

  async getAuthToken(): Promise<string> {
    if (this.cachedToken) {
      return this.cachedToken;
    }

    logger.info('Authenticating API user for worker session', '');

    const response = await this.request.post(`${env.API_BASE_URL}/auth/login`, {
      data: {
        username: env.API_AUTH_USERNAME,
        password: env.API_AUTH_PASSWORD,
      },
    });

    if (!response.ok()) {
      throw new Error(`Failed to authenticate API user: ${response.status()} ${await response.text()}`);
    }

    const body = (await response.json()) as AuthTokenResponse;
    this.cachedToken = body.token;
    return this.cachedToken;
  }
}
