import type { ReactNode } from "react";

export interface Col<T extends object> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => ReactNode;
  searchable?: boolean;
}

interface SearchTableProps<T extends object> {
  data: T[];
  columns: Col<T>[];
  empty?: string;
  pageSize?: number;
  searchPlaceholder?: string;
  toolbar?: ReactNode;
}

function getValue<T extends object>(row: T, key: keyof T | string): unknown {
  return (row as Record<string, unknown>)[String(key)];
}

/**
 * Server-safe table component.
 *
 * Important for Next.js App Router:
 * - Do NOT mark this file with "use client".
 * - Server pages are allowed to pass render functions into this component because
 *   everything renders on the server and no function is serialized to a Client Component.
 * - Client pages can still import it; then it becomes part of the client bundle and
 *   render callbacks are safe because they stay client-side.
 */
export default function SearchTable<T extends object>({
  data,
  columns,
  empty = "No records found.",
  pageSize,
  toolbar,
}: SearchTableProps<T>) {
  const visibleRows = typeof pageSize === "number" && pageSize > 0 ? data.slice(0, pageSize) : data;

  return (
    <div>
      {(toolbar || typeof pageSize === "number") && (
        <div className="toolbar">
          {toolbar}
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)" }}>
            {data.length} record{data.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={String(col.key)}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="empty">{empty}</div>
                </td>
              </tr>
            ) : (
              visibleRows.map((row, i) => (
                <tr key={i}>
                  {columns.map((col) => {
                    const val = getValue(row, col.key);
                    return <td key={String(col.key)}>{col.render ? col.render(row) : String(val ?? "—")}</td>;
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status?: unknown }) {
  if (!status) return <span className="chip muted">—</span>;
  const s = String(status).toLowerCase();
  let cls = "chip muted";
  if (["paid", "active", "open", "completed", "complete", "submitted", "approved", "resolved"].some((k) => s.includes(k))) cls = "chip ok";
  else if (["unpaid", "overdue", "draft", "pending", "waiting", "sent"].some((k) => s.includes(k))) cls = "chip warn";
  else if (["cancelled", "canceled", "failed", "expired", "suspended", "rejected", "urgent"].some((k) => s.includes(k))) cls = "chip danger";
  else if (["in progress", "running", "queued", "scheduled"].some((k) => s.includes(k))) cls = "chip info";
  return <span className={cls}>{String(status)}</span>;
}
