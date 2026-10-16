"use server";

import { refresh } from "next/cache";
import { api } from "@/lib/api";

export type FormState = { error?: string };

export async function createTodo(_prev: FormState, formData: FormData): Promise<FormState> {
  const title = String(formData.get("title") ?? "");

  // `body` is type-checked against CreateTodoRequest in the spec.
  const { error } = await api.POST("/todos", { body: { title } });

  if (error) {
    // Errors follow the Problem schema in the spec (RFC 9457); show the first field error.
    return { error: error.errors?.[0]?.message ?? error.detail ?? "Could not create todo" };
  }

  refresh();
  return {};
}

export async function toggleTodo(id: number, done: boolean) {
  await api.PATCH("/todos/{id}", { params: { path: { id } }, body: { done } });
  refresh();
}

export async function deleteTodo(id: number) {
  await api.DELETE("/todos/{id}", { params: { path: { id } } });
  refresh();
}
