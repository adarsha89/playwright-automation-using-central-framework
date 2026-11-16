import type { Page } from '@playwright/test';
import { joinUrl } from '@qe/base-js';
import { test as base } from '@qe/base-web-js';
import { env } from '../config/env';
import { AuthHelper } from '../api/helpers/auth.helper';
import { UsersClient, type CreateUserPayload } from '../api/clients/example.client';
import { buildUserPayload, buildLoginCredentials, type LoginCredentials } from '../data/builders/example.builder';
import { LoginPage } from '../pages/saucedemo/login.page';
import { SAUCEDEMO_USERS } from '../data/saucedemo/saucedemo-users.data';

/**
 * All custom fixtures are declared once here and imported by every spec
 * (`import { test, expect } from '../../fixtures'`) — no per-file
 * `beforeEach` duplication (framework-guidelines principle b).
 *
 * This extends `@qe/base-web-js`'s own `test` (not `@playwright/test`'s `base`
 * directly), which already wires the shared-browser execution model — one
 * detached browser per engine per run, shared by every worker — through its
 * worker-scoped `sharedBrowser` fixture and an overridden `connectOptions`.
 * See that package for the execution-model details; this repo only adds its
 * own app-specific fixtures on top.
 */

interface TestData {
  user: CreateUserPayload;
  loginCredentials: LoginCredentials;
}

interface TestFixtures {
  /** A page that has already logged in through the UI, ready to use. */
  authenticatedPage: Page;
  /** Typed API client for the example "users" resource, pre-wired with auth. */
  exampleClient: UsersClient;
  /** Faker-backed synthetic test data — specs never inline raw literals. */
  testData: TestData;
  /** A page already logged into SauceDemo as `standard_user`, ready to use. */
  sauceDemoAuthenticatedPage: Page;
}

interface WorkerFixtures {
  /** Authenticates once per worker and caches the bearer token. */
  authToken: string;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  authToken: [
    async ({ playwright }, use) => {
      const requestContext = await playwright.request.newContext();
      const authHelper = new AuthHelper(requestContext);
      const token = await authHelper.getAuthToken();
      await use(token);
      await requestContext.dispose();
    },
    { scope: 'worker' },
  ],

  exampleClient: async ({ request, authToken }, use) => {
    const client = new UsersClient(request, env.API_BASE_URL, authToken);
    await use(client);
  },

  authenticatedPage: async ({ page }, use) => {
    await page.goto(joinUrl(env.BASE_URL, 'login'));
    await page.getByLabel('Email').fill(env.TEST_USER_EMAIL);
    await page.getByLabel('Password').fill(env.TEST_USER_PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await use(page);
  },

  testData: async ({}, use) => {
    await use({
      user: buildUserPayload(),
      loginCredentials: buildLoginCredentials(),
    });
  },

  sauceDemoAuthenticatedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(SAUCEDEMO_USERS.standard.username, SAUCEDEMO_USERS.standard.password);
    await page.waitForURL(joinUrl(env.SAUCEDEMO_BASE_URL, 'inventory.html'));
    await use(page);
  },
});

export { expect } from '@qe/base-web-js';
