# playwright-automation-using-central-framework

A Playwright + TypeScript test automation suite covering UI and API testing, built on the
**central `qe-base-js` framework** (`@qe/base-js`, `@qe/base-api-js`, `@qe/base-web-js`) rather
than implementing its own base layer. This repo owns only the application-specific slice:
typed env config, page objects, API clients, test data, and specs. Everything AUT-agnostic —
`BasePage`, `BaseClient`, the shared-browser execution model, the typed-env factory, the logger,
the mutation-testing switch, request-building and response-assertion helpers, and the race-free
network-interception primitive — is consumed as a dependency, not maintained here.

## Tech stack

- [Playwright Test](https://playwright.dev/) `1.62.1` — test runner, browser automation, API testing (pinned by `@qe/bom-web-js`)
- [`@qe/base-js`](https://gitlab.com/) — typed env config (`createEnv`), logger, `joinUrl`, the mutation-testing switch
- [`@qe/base-api-js`](https://gitlab.com/) — `BaseClient`, request-building and response-assertion helpers
- [`@qe/base-web-js`](https://gitlab.com/) — `BasePage`, the shared-browser execution model, `applyUiMutation`, `waitForResponses`
- TypeScript (strict mode)
- [Zod](https://zod.dev/) — this app's own env-var schema (via `@qe/base-js`'s `createEnv`) and API response schema validation
- [@faker-js/faker](https://fakerjs.dev/) — synthetic test data generation
- ESLint (flat config) + Prettier
- Jenkins (CI), using the `mcr.microsoft.com/playwright` Docker image

## The central framework

This repo depends on the `@qe/bom-*-js` (version pins) and `@qe/base-*-js` (real code) packages
published from the sibling `qe-base-js` repo, via its GitLab project npm registry (project
`88594233`, scope `@qe`) — see that repo's README, "Consuming this framework from another repo".
`.npmrc` (committed, no secret) points the `@qe` scope at the registry:

```ini
@qe:registry=https://gitlab.com/api/v4/projects/88594233/packages/npm/
```

**Project `88594233` is public, so `npm install` works with no auth token** — verified directly
against the registry (`curl` against the package metadata endpoint returns `200` with no
credentials, and a real `npm install` in this repo resolves all six `@qe/*` packages). No
`GITLAB_PRIVATE_TOKEN_FOR_JS`/`~/.npmrc` setup is needed to consume this framework today. A token
is only needed for _publishing_ to the registry (not something this repo does), or if the
project's visibility ever changes to private/internal — in that case, add the auth-token line to
your own `~/.npmrc` (never to this repo's committed one):

```ini
//gitlab.com/api/v4/projects/88594233/packages/npm/:_authToken=${GITLAB_PRIVATE_TOKEN_FOR_JS}
```

| Package           | What this repo gets from it                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@qe/base-js`     | `createEnv`, `mutationEnabledFields`, `logger`, `joinUrl`, `isPlaywrightDebugMode`, `mutationEnabled`/`mutationId`/`isMutationActive`            |
| `@qe/base-api-js` | `BaseClient`/`ApiError`, `buildDefaultHeaders`/`buildPath`/`buildQuery`, `expectStatus`/`expectSchema`/`expectErrorShape`                        |
| `@qe/base-web-js` | `BasePage`, `applyUiMutation`, `waitForResponses`, the shared-browser execution model (`test`/`expect`, `sharedBrowserProjects`, setup/teardown) |

Extending the framework in place (new app-specific fixtures, page objects, API clients) never
means re-implementing something the central packages already provide — if a need looks
AUT-agnostic, it likely belongs upstream in `qe-base-js`, not duplicated here.

## Architecture

Specs orchestrate only: they use the fixtures layer (`fixtures/index.ts`, extending
`@qe/base-web-js`'s own `test`), which builds page objects (extending `@qe/base-web-js`'s
`BasePage`) and API clients (extending `@qe/base-api-js`'s `BaseClient`) on top of this app's own
config, data builders and helpers. UI tests run in a shared browser per engine (see
[Execution model](#execution-model-one-shared-browser-per-engine)), and every run publishes HTML
and JUnit reports.

## Project structure

```
api/
  clients/           Typed API clients (e.g. UsersClient), extending @qe/base-api-js's BaseClient
  helpers/           App-specific auth helper (this app's own /auth/login scheme)
config/
  env.ts             This app's env-var schema, parsed by @qe/base-js's createEnv (Zod-validated)
data/
  builders/          Faker-backed test data builders
  saucedemo/         Static fixture data (users, products) for the SauceDemo slice
docs/
  exploration/       Codegen output from headed exploration of target pages
  plans/             Feature plans produced before implementation
  requirements/      Requirements docs produced before planning
  reports/           Code review / quality reports
fixtures/
  index.ts           App-specific fixtures (authenticatedPage, exampleClient, testData, ...),
                     extending @qe/base-web-js's test (which already wires the shared browser)
pages/
  saucedemo/         SauceDemo page objects (login, inventory, cart), extending @qe/base-web-js's BasePage
  example.page.ts    Sample page object for the Playwright docs homepage
tests/
  setup/             Thin re-exports of @qe/base-web-js's setup_<engine>/teardown_<engine> tests
  ui/                UI specs (chromium/firefox/webkit projects)
  api/               API specs (api project)
utils/
  network.ts         App-specific network assertions, built on @qe/base-web-js's waitForResponses
```

## Prerequisites

- Node.js 22+
- npm

No registry credentials are needed — project `88594233` is public (see "The central framework",
above).

## Setup

```bash
npm install
npx playwright install
cp .env.example .env   # fill in real values, see below
```

### Environment variables

All env vars are read once through `config/env.ts` (parsed by `@qe/base-js`'s `createEnv`,
Zod-validated at import time) — nothing else in the codebase reads `process.env` directly. See
`.env.example` for the full list:

| Variable                                  | Purpose                                                       |
| ----------------------------------------- | ------------------------------------------------------------- |
| `BASE_URL`                                | Base URL for the default UI project                           |
| `API_BASE_URL`                            | Base URL for the `api` test project                           |
| `TEST_USER_EMAIL` / `TEST_USER_PASSWORD`  | Credentials used by the `authenticatedPage` fixture           |
| `API_AUTH_USERNAME` / `API_AUTH_PASSWORD` | Credentials used by `api/helpers/auth.helper.ts`              |
| `SAUCEDEMO_BASE_URL`                      | Base URL for the SauceDemo feature slice (login + cart tests) |
| `MUTATION_ENABLED`                        | Mutation-testing switch (`@qe/base-js`); never `true` on CI   |

Each new target site/app gets its own dedicated `<SITE>_BASE_URL` var rather than repointing the
shared `BASE_URL` (see `SAUCEDEMO_BASE_URL` for the pattern).

## Running tests

```bash
npm test                          # run the full suite (chromium, firefox, webkit, api)
npx playwright test --project=chromium
npx playwright test tests/ui/saucedemo
npx playwright test --grep @smoke
npx playwright test --grep @network-validation
npx playwright test --ui           # interactive UI mode
npx playwright show-report         # open the last HTML report
```

Every testcase carries Playwright `tag` options — a shared classification tag (`@smoke`,
`@regression`, `@api`, ...) plus a unique scenario tag (e.g. `@login-valid-credentials`) — so a
single tag identifies exactly which test ran in a report.

### Execution model: one shared browser per engine

The shared-browser execution model — one detached, loopback-only browser server per engine per
run, shared by every worker of every UI project on it — is implemented entirely in
`@qe/base-web-js`, not this repo. `playwright.config.ts` wires it in with that package's
`sharedBrowserProjects()`, and `tests/setup/shared-browser.{setup,teardown}.ts` are thin
re-exports of that package's own setup/teardown tests (Playwright needs them under this repo's
`testDir`). See `@qe/base-web-js`'s own documentation for the full mechanics (runner-pid
watchdog, crash attribution, `--debug`/`PWDEBUG` fallback, etc.) — summary:

- Specs must import `{ test, expect }` from `fixtures/` (which extends `@qe/base-web-js`'s own
  `test`) to get this behaviour. A spec importing `@playwright/test` directly uses a per-worker
  browser.
- `--project=api`, or a `--grep` that selects only API tests, starts no browser.
- `--debug` / `PWDEBUG` falls back to a per-worker browser so the Inspector works.
- macOS and Linux only (the stop path signals process groups).

### Other scripts

```bash
npm run lint        # ESLint (flat config, eslint.config.mjs)
npm run typecheck   # tsc --noEmit
npm run format        # prettier --write .
npm run format:check  # prettier --check . (CI gate)
```

## Notes

- **Users API tests** (`tests/api/example.spec.ts`, `@api-fetch-user-by-id` / `@api-create-user`) require `API_BASE_URL` to point at a backend implementing both `/auth/login` and `/users`. They will not pass against a public demo API with no auth layer (e.g. jsonplaceholder) — see `.env.example`.
- **SauceDemo slice** (`tests/ui/saucedemo/`) has no mockable backend API; the only real interceptable network traffic is a pair of Backtrace.io analytics beacons, asserted via `utils/network.ts`'s `assertBacktraceEventsBeaconPair`.
- Repo-specific automation conventions, learnings, and non-negotiable workflow rules (e.g. always explore pages headed before writing UI test code, never run Playwright tests inside the sandboxed shell) live in `.ai/context/` — tool-agnostic, and loaded by any AI assistant via `CLAUDE.md` (Claude Code) or `AGENTS.md` (Codex, Cursor, Copilot, Gemini CLI, …). Skills and agents are in `.ai/skills/` and `.ai/agents/` (see `.ai/README.md`).

## CI

The `.ci/jenkins/Jenkinsfile` runs on the `mcr.microsoft.com/playwright:v<installed-version>-noble` image (keep the tag in lockstep with `@playwright/test` in `package-lock.json`): install (resolves `@qe/*` from the public GitLab registry with no auth) → lint / typecheck / Prettier check (parallel) → `playwright test --shard=SHARD_INDEX/SHARD_TOTAL` (build parameters, default `1/1`), publishing JUnit results and archiving the HTML report/test-results. CI runs headless (`headless: !!process.env.CI`); local runs are headed.

Every variable `config/env.ts` validates must exist in CI. Create these Jenkins secret-text credentials:

| Credential ID           | Env var              |
| ----------------------- | -------------------- |
| `qa-base-url`           | `BASE_URL`           |
| `qa-api-base-url`       | `API_BASE_URL`       |
| `qa-test-user-email`    | `TEST_USER_EMAIL`    |
| `qa-test-user-password` | `TEST_USER_PASSWORD` |
| `qa-api-auth-username`  | `API_AUTH_USERNAME`  |
| `qa-api-auth-password`  | `API_AUTH_PASSWORD`  |

`SAUCEDEMO_BASE_URL` is a public demo URL and is set directly in the `.ci/jenkins/Jenkinsfile`. No registry
credential is needed (project `88594233` is public) — if that ever changes, add a
`gitlab-private-token-for-js` credential and the auth step shown in "The central framework", above.
