import "server-only";
import { connection } from "next/server";
import { api } from "@/lib/api/server";

// Reads for this feature. Server Components call these; mutations live in actions.ts.
export async function getTodos() {
  await connection(); // per-request data: don't prerender at build time
  return api.GET("/todos");
}
