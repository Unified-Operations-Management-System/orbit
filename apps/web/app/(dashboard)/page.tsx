import { Suspense } from "react";
import { AddTodoForm, TodoList } from "@/features/todos";

// Pages only compose features; data fetching and mutations live in features/<domain>/.
export default function TodosPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Todos</h1>

      <AddTodoForm />

      <Suspense fallback={<p className="text-neutral-500">Loading…</p>}>
        <TodoList />
      </Suspense>

      <footer className="mt-auto text-sm text-neutral-500">
        OpenAPI contract → typed client → Go. API docs at{" "}
        <a className="underline" href="http://localhost:8080/docs">
          localhost:8080/docs
        </a>
      </footer>
    </main>
  );
}
