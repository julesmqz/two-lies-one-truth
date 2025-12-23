Project: two-lies-one-truth (Vue 3 + Vite + Firebase + Pinia)

This document captures project-specific practices for building, configuring, testing, and developing this app. It assumes familiarity with Vite, Vue 3, and modern JS tooling.

1. Build and Configuration Instructions

- Node version: package.json enforces Node ^20.19.0 or >=22.12.0. Use one of these for consistent ESM, node:test, and Vite behavior.
- Install dependencies:
  - npm install
- Development server:
  - npm run dev
  - Uses Vite with @vitejs/plugin-vue and vite-plugin-vue-devtools enabled (see vite.config.js). The devtools plugin is only for development.
- Production build:
  - npm run build
  - Preview build locally with npm run preview
- Module resolution and aliases:
  - The alias '@' points to ./src (configured in vite.config.js and mirrored in jsconfig.json). Prefer import paths like import X from '@/components/X.vue' to avoid brittle relative paths.
- Firebase configuration:
  - src/firebase.js reads Vite env variables. Provide these in a .env (not committed) or your environment at build/run time:
    - VITE_FIREBASE_API_KEY
    - VITE_FIREBASE_AUTH_DOMAIN
    - VITE_FIREBASE_PROJECT_ID
    - VITE_FIREBASE_STORAGE_BUCKET
    - VITE_FIREBASE_MESSAGING_SENDER_ID
    - VITE_FIREBASE_APP_ID
  - For local development without hitting production services, consider the Firebase Emulator Suite. If enabled, inject emulator initialization after getFirestore(app) (not currently wired up here) and guard with an env flag, e.g., VITE_USE_FIREBASE_EMULATORS=true.

2. Testing Information

Current repo does not include a full-featured test runner (e.g., Vitest/Jest) or component testing setup. Given the Node engine constraint, the simplest no-dependency approach is to use Node’s built-in test runner (node:test) for fast unit tests of pure JS modules/utilities.

- Running tests with Node’s built-in runner:
  - Command: node --test
  - It discovers files matching the common patterns like **/*.test.js, **/*.test.mjs, **/*.spec.js, etc., under the working directory.
  - Assertions can be made using node:assert.

- Adding a new test:
  1) Create a file whose name ends with .test.js or .test.mjs. Example: tests/math.test.mjs
  2) Author tests using node:test and node:assert. Example snippet:
     import test from 'node:test';
     import assert from 'node:assert/strict';

     test('basic arithmetic works', () => {
       assert.equal(2 + 2, 4);
     });

  3) Run tests with node --test

- Demo that was verified during preparation of this guideline:
  - A minimal test file tests/sample.test.mjs was created temporarily with a trivial assertion using node:test. It passed locally when executed with node --test, then was removed to keep the repo clean as requested. You can reproduce by following the “Adding a new test” steps above.

- Notes and recommendations for future test strategy:
  - For unit tests in this codebase, prefer extracting logic into framework-agnostic modules (e.g., src/lib or src/utils) so they can be tested with node:test without frontend tooling.
  - For Vue components, adopt Vitest + @vue/test-utils (common for Vite projects). This will require adding devDependencies and a vitest.config.ts that leverages the existing Vite config. Keep Firebase calls mocked (dependency-inject the Firestore API or abstract in a service layer) to avoid network calls.
  - For e2e/flow validation, consider Playwright or Cypress. Use the Firebase Emulator Suite for deterministic runs.

3. Additional Development Information

- Code style and patterns:
  - The project is ESM-only ("type": "module"). Prefer named exports for utilities and services.
  - Centralize external integrations under src/services (e.g., gameService) and keep UI components dependency-free from Firebase specifics where possible. Use stores (Pinia) or service functions to mediate data.
  - Time-sensitive fields (e.g., timerEnd in game state) are computed via Date.now() on the client before being written to Firestore. Be mindful of client clock skew if adding features relying on consistent timing; consider server timestamps when feasible.

- Firestore schema (as implied by gameService.js):
  - Collection games/{gameId}
    - Fields: status ('lobby'|'playing'|'leaderboard'), currentTurnPlayerId, turnIndex, slideTimer, timerEnd, createdAt
  - Subcollection games/{gameId}/players/{playerId}
    - Fields: name, isReady, options (array with one marked isTruth), score, isHost, votedForIndex
  - nextTurn recomputes per-turn scores and resets votedForIndex for all players using a write batch.

- Aliases and imports:
  - Use '@' for src to improve maintainability.
  - Keep cross-layer imports one-directional (views -> stores/services -> firebase). Avoid importing views from services.

- Environment management:
  - Vite exposes env variables with VITE_ prefix at build time (import.meta.env). Do not access secret values in the client unless necessary; prefer server-side mediation for sensitive data.

- Local debugging tips:
  - Enable Vue Devtools (browser extensions) and the vite-plugin-vue-devtools panel during development.
  - For Firestore data, use the Emulators UI when developing against emulators.

- Common pitfalls:
  - Using relative imports instead of '@' can lead to fragile pathing when moving files.
  - Importing Firebase modules directly inside components increases coupling and complicates testing. Keep firebase access within src/firebase.js and services.
  - Ensure Node matches the engines field; older Node versions may fail on ESM or node:test.
