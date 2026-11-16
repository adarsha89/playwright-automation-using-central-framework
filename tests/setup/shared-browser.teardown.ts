/**
 * Pairs with `shared-browser.setup.ts` (see its comment) — re-exports the central framework's
 * `teardown_<engine>` test (`@qe/base-web-js`), which stops the engine's shared browser once
 * every UI project on it has finished.
 */
import '@qe/base-web-js/dist/setup/shared-browser.teardown';
