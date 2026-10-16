"use client";

import { useActionState } from "react";
import { createTodo, type FormState } from "../actions";

export function AddTodoForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(createTodo, {});

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          name="title"
          placeholder="What needs doing?"
          className="flex-1 rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-foreground px-4 py-2 text-background disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
      {/* Validation runs in Go (minLength:"1"); its message is shown here. */}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
