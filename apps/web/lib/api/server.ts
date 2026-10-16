import "server-only";
import { createApiClient } from "@orbit/api-client";

/**
 * Server-side client: Server Components and Server Actions call the Go API
 * directly over the internal network (no extra hop through Next.js).
 * `server-only` makes the build fail if a Client Component imports this.
 */
export const api = createApiClient(process.env.API_URL ?? "http://localhost:8080");
