import { z } from 'zod';
import { BaseClient } from '@qe/base-api-js';

/** Shape returned by the example "users" resource. */
export const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
});

export type User = z.infer<typeof userSchema>;

export interface CreateUserPayload {
  name: string;
  email: string;
}

/**
 * One typed client per resource, extending the central framework's `BaseClient`
 * (`@qe/base-api-js`). New endpoints follow this same pattern: extend `BaseClient`,
 * add a typed method — no new auth or parsing logic per client. `baseUrl` comes from
 * this app's own `config/env.ts`, not from `BaseClient` itself.
 */
export class UsersClient extends BaseClient {
  async getUser(id: number): Promise<User> {
    return this.get<User>('/users/:id', { pathParams: { id } });
  }

  async createUser(payload: CreateUserPayload): Promise<User> {
    return this.post<User>('/users', { data: payload });
  }
}
