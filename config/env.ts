import { z } from 'zod';
import { createEnv, mutationEnabledFields } from '@qe/base-js';

/**
 * This app's typed, validated environment schema. `createEnv` (from the central
 * `@qe/base-js` framework) does the actual parsing/throwing — this module only supplies
 * the shape. Nothing else in this repo should read `process.env` directly
 * (framework-guidelines principle c) except `playwright.config.ts` for `CI`.
 */
const envSchema = z.object({
  BASE_URL: z.string().url(),
  API_BASE_URL: z.string().url(),
  TEST_USER_EMAIL: z.string().email(),
  TEST_USER_PASSWORD: z.string().min(1),
  API_AUTH_USERNAME: z.string().min(1),
  API_AUTH_PASSWORD: z.string().min(1),
  SAUCEDEMO_BASE_URL: z.string().url(),
  ...mutationEnabledFields,
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = createEnv(envSchema);
