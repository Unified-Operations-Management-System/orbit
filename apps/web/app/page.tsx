import { Suspense } from "react";
import { AddTodoForm } from "./add-todo-form";
import { HealthBadge } from "./health-badge";
import { TodoList } from "./todo-list";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-16">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Todos</h1>
        <HealthBadge />
      </header>

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
