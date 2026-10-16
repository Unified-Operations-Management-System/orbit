import { createApiClient } from "@orbit/api-client";

/**
 * Browser-side client: goes through the /api rewrite in next.config.ts,
 * so requests are same-origin (no CORS, cookies included).
 */
export const browserApi = createApiClient("/api");
