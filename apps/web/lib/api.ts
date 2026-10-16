import { createApiClient } from "@orbit/api-client";

/**
 * Server-side client: Server Components and Server Actions call the Go API
 * directly over the internal network (no extra hop through Next.js).
 */
export const api = createApiClient(process.env.API_URL ?? "http://localhost:8080");

/**
 * Browser-side client: goes through the /api rewrite in next.config.ts,
 * so requests are same-origin (no CORS, cookies included).
 */
export const browserApi = createApiClient("/api");
