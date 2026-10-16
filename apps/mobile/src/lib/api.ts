import { createApiClient } from "@orbit/api-client";
import Constants from "expo-constants";
import createQueryHooks from "openapi-react-query";
import { Platform } from "react-native";

/**
 * Where the API lives.
 *
 * 1. EXPO_PUBLIC_API_URL wins (set it for preview/production builds, e.g. https://api.example.com).
 * 2. In development on a phone/emulator, reuse the host that Metro is served from
 *    (your machine's LAN IP), so a physical device reaches your machine with no config.
 * 3. Otherwise (web, simulators without a host) fall back to localhost.
 *
 * The dev port is 8080 (Go API). Set EXPO_PUBLIC_API_PORT=4010 to use the Prism
 * mock server instead, e.g. before the backend has implemented a new endpoint.
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const port = process.env.EXPO_PUBLIC_API_PORT ?? "8080";
  if (Platform.OS !== "web") {
    const host = Constants.expoConfig?.hostUri?.split(":")[0];
    if (host) return `http://${host}:${port}`;
  }
  return `http://localhost:${port}`;
}

export const API_URL = resolveApiUrl();

/** Plain typed client (same one the web app uses). */
export const api = createApiClient(API_URL);

/** Typed TanStack Query hooks: $api.useQuery("get", "/todos"), $api.useMutation("post", "/todos"). */
export const $api = createQueryHooks(api);
