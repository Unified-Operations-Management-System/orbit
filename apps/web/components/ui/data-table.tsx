import type { ReactNode } from "react";

// Header cells that stay put while rows scroll under them. Sticky goes on the cells, not
// <thead> (a collapsed-border table lets rows show through above a sticky thead), and the
// table's top rule and header divider are drawn as shadows so they travel with the header.
export const stickyHeadCell = "sticky top-0 z-10 bg-paper shadow-[inset_0_2px_0_var(--color-ink),inset_0_-1px_0_var(--color-line)]";

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  stickyHeader,
}: {
  columns: { key: string; header: string; render: (row: T) => ReactNode; align?: "left" | "right" | "center" }[];
  rows: T[];
  rowKey: (row: T) => string | number;
  empty?: ReactNode;
  /** Keep column headers visible while the rows scroll (use inside a Panel). */
  stickyHeader?: boolean;
}) {
  return (
    <table className={`w-full text-left ${stickyHeader ? "" : "border-t-2 border-ink"}`}>
      <thead>
        <tr>
          {columns.map((c) => (
            <th
              key={c.key}
              scope="col"
              className={`py-2 text-xs font-bold uppercase tracking-[0.12em] text-muted ${stickyHeader ? stickyHeadCell : ""} ${
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
