// ESLint 9+ requires flat config (https://eslint.org/docs/latest/use/configure/migration-guide) —
// no `.eslintrc.*` here. Mirrors qe-base-js's own `eslint.config.mjs` (same plugins/rules intent):
// `@typescript-eslint` recommended + `eslint-plugin-playwright` recommended on test files +
// `eslint-config-prettier` last to disable stylistic conflicts.

import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import playwright from 'eslint-plugin-playwright';
import prettierConfig from 'eslint-config-prettier';

export default [
  {
    ignores: [
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'reports/**',
      'blob-report/**',
      'dist/**',
      'build/**',
      // Seed file for a scaffolding/generator agent to fill in — outside every project's
      // `testMatch`, so it never runs as part of the suite.
      'tests/seed.spec.ts',
    ],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['tests/**/*.ts'],
    ...playwright.configs['flat/recommended'],
  },
  prettierConfig,
];
