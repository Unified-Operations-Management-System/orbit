import { deleteTodo, toggleTodo } from "../actions";
import { getTodos } from "../queries";

// Server Component: fetches from Go at request time and streams in under <Suspense>.
export async function TodoList() {
  const { data: todos, error } = await getTodos();

  if (error || !todos) {
    return <p className="text-red-600">Couldn&apos;t reach the Go API. Is it running on :8080?</p>;
  }

  if (todos.length === 0) {
    return <p className="text-neutral-500">Nothing to do. Add something above.</p>;
  }

  return (
    <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
      {todos.map((todo) => (
        <li key={todo.id} className="flex items-center gap-3 py-3">
          <form action={toggleTodo.bind(null, todo.id, !todo.done)}>
            <button
              type="submit"
              aria-label={todo.done ? "Mark as not done" : "Mark as done"}
              className="grid size-5 place-items-center rounded border border-neutral-400 text-xs"
            >
              {todo.done ? "✓" : ""}
            </button>
          </form>
          <span className={todo.done ? "flex-1 text-neutral-400 line-through" : "flex-1"}>
            {todo.title}
          </span>
          <form action={deleteTodo.bind(null, todo.id)}>
            <button type="submit" className="text-sm text-neutral-400 hover:text-red-600">
              Delete
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
