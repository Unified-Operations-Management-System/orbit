import type { ReactNode } from "react";

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
}: {
  columns: { key: string; header: string; render: (row: T) => ReactNode; align?: "left" | "right" | "center" }[];
  rows: T[];
  rowKey: (row: T) => string | number;
  empty?: ReactNode;
}) {
  return (
    <table className="w-full border-t-2 border-ink text-left">
      <thead>
        <tr>
          {columns.map((c) => (
            <th
              key={c.key}
              scope="col"
              className={`py-2 text-xs font-bold uppercase tracking-[0.12em] text-muted ${
                c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : ""
              }`}
            >
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="border-t border-line py-3 text-sm text-muted">
              {empty ?? "Nothing here yet."}
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={rowKey(row)} className="border-t border-line">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`py-3 ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : ""}`}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
