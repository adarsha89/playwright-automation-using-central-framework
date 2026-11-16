import { defineConfig, devices } from '@playwright/test';
import { mutationEnabled } from '@qe/base-js';
import { sharedBrowserProjects } from '@qe/base-web-js';
import { env } from './config/env';

if (process.env.CI && mutationEnabled()) {
  throw new Error('MUTATION_ENABLED=true is not allowed in CI. Set it to false or unset it.');
}

// Filter at the UI/API project level so shared-browser setup/teardown projects still run.
const mutationGrep = mutationEnabled() ? /@mutation-target/ : undefined;
const uiProjects = [
  { name: 'chromium', testMatch: 'ui/**/*.spec.ts', grep: mutationGrep, use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', testMatch: 'ui/**/*.spec.ts', grep: mutationGrep, use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', testMatch: 'ui/**/*.spec.ts', grep: mutationGrep, use: { ...devices['Desktop Safari'] } },
];
const apiProject = {
  name: 'api',
  testMatch: 'api/**/*.spec.ts',
  grep: mutationGrep,
  use: {
    baseURL: env.API_BASE_URL,
  },
};

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * The shared-browser execution model (`sharedBrowserProjects`, below) is implemented by the
 * central `@qe/base-web-js` framework, not this repo — this config only wires it in. See that
 * package's `fixtures.ts`/`shared-browser/` for the detached-browser-server mechanics.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only (framework-guidelines principle g). */
  retries: process.env.CI ? 1 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 2 : undefined,
  /* HTML for local review, JUnit for the Jenkins JUnit plugin. */
  reporter: [['html'], ['junit', { outputFile: 'reports/junit-results.xml' }], ['blob']],
  use: {
    baseURL: env.BASE_URL,
    /* Local runs have no retries, so keep traces for any failure there; on CI, record on the first retry. */
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    /* Headed locally for visibility; CI agents (Docker) have no display, so run headless there. */
    headless: !!process.env.CI,
  },

  /* Mutation runs omit shared-browser lifecycle projects and use per-worker browsers. */
  projects: mutationEnabled() ? [...uiProjects, apiProject] : [...sharedBrowserProjects(uiProjects), apiProject],
});
