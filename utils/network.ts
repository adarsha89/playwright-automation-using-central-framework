import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { waitForResponses } from '@qe/base-web-js';

/**
 * App-specific network-assertion helper, built on the central framework's
 * race-free `waitForResponses` primitive (`@qe/base-web-js`) rather than a
 * raw sequential `page.waitForResponse()` after the triggering action — see
 * that primitive's doc comment for why the registration order matters.
 *
 * Validated live against `https://www.saucedemo.com/` in
 * `docs/exploration/saucedemo-network-interception-codegen.ts`: on both
 * login-page load and add-to-cart click, the app fires a pair of calls to
 * Backtrace.io (a third-party error/event-tracking SaaS embedded in the
 * app), which deterministically respond `401` with a fixed JSON error body
 * because the site ships literal `UNIVERSE`/`TOKEN` placeholder query
 * values. This is real, unmocked, third-party traffic — there is no
 * business-logic backend call on this site to intercept/mock.
 */

/** Matches `POST https://events.backtrace.io/api/unique-events/submit?...` */
export const UNIQUE_EVENTS_URL_PATTERN = /events\.backtrace\.io\/api\/unique-events\/submit/;
/** Matches `POST https://events.backtrace.io/api/summed-events/submit?...` */
export const SUMMED_EVENTS_URL_PATTERN = /events\.backtrace\.io\/api\/summed-events\/submit/;

/** Shared source of truth for the expected response body from both endpoints. */
export const EXPECTED_BACKTRACE_ERROR_BODY = {
  error: {
    message: 'Unauthorized request',
    code: 6,
  },
};

const RESPONSE_WAIT_TIMEOUT_MS = 10_000;

/**
 * Observes the `events.backtrace.io` `unique-events`/`summed-events` submit
 * beacon pair triggered by `trigger()`, and asserts each response's status,
 * content-type, and JSON body.
 */
export async function assertBacktraceEventsBeaconPair(page: Page, trigger: () => Promise<void>): Promise<void> {
  const responses = await waitForResponses(
    page,
    [
      (response) => UNIQUE_EVENTS_URL_PATTERN.test(response.url()),
      (response) => SUMMED_EVENTS_URL_PATTERN.test(response.url()),
    ],
    trigger,
    { timeoutMs: RESPONSE_WAIT_TIMEOUT_MS },
  );

  for (const response of responses) {
    expect(response.status()).toBe(401);
    expect(response.headers()['content-type']).toContain('application/json');
    expect(await response.json()).toEqual(EXPECTED_BACKTRACE_ERROR_BODY);
  }
}
