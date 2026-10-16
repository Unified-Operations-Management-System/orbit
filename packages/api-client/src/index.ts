import createClient from "openapi-fetch";
import type { components, paths } from "./schema.gen";

export type { components, paths };

// Friendly aliases for the schemas you use most.
export type Todo = components["schemas"]["Todo"];
export type Problem = components["schemas"]["Problem"];
export type FieldError = components["schemas"]["FieldError"];

/**
 * Typed client for the Go API. Paths, params, bodies and responses are all
 * checked against the OpenAPI contract in packages/api-spec.
 *
 * - On the server (Server Components, Server Actions): pass the internal URL,
 *   e.g. process.env.API_URL ("http://localhost:8080").
 * - In the browser: pass "/api", which Next.js rewrites to the Go server.
 */
export function createApiClient(baseUrl: string, init?: { headers?: HeadersInit }) {
  return createClient<paths>({ baseUrl, headers: init?.headers });
}

export type ApiClient = ReturnType<typeof createApiClient>;
