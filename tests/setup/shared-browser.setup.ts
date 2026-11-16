/**
 * `sharedBrowserProjects()` (from `@qe/base-web-js`, wired in `playwright.config.ts`) points
 * each generated `setup_<engine>` project at `setup/shared-browser.setup.ts`, relative to
 * `testDir`. The actual test — starting the engine's one shared browser server for this run —
 * is implemented in the central framework package, not this repo; this file only re-exports it
 * so Playwright can load it from a path under this repo's own `testDir`.
 */
import '@qe/base-web-js/dist/setup/shared-browser.setup';
