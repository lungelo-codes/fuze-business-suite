"use client";

import { useState, useMemo, ReactNode } from "react";

export interface Col<T> {
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

export default function SearchTable<T extends object>({
  data,
  columns,
  empty = "No records found.",
  pageSize = 20,
  searchPlaceholder = "Search…",
  toolbar,
}: SearchTableProps<T>) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const searchableCols = columns.filter((c) => c.searchable !== false);

  const filtered = useMemo(() => {
    if (!query.trim()) return data;
    const q = query.toLowerCase();
    return data.filter((row) =>
      searchableCols.some((col) => {
        const v = getValue(row, col.key);
        return v != null && String(v).toLowerCase().includes(q);
      })
    );
  }, [data, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function handleSearch(val: string) {
    setQuery(val);
    setPage(1);
  }

  return (
    <div>
      <div className="toolbar">
        <div className="search">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        {toolbar}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)" }}>
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

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
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="empty">{query ? `No results for "${query}"` : empty}</div>
                </td>
              </tr>
            ) : (
              paged.map((row, i) => (
                <tr key={i}>
                  {columns.map((col) => {
                    const val = getValue(row, col.key);
                    return (
                      <td key={String(col.key)}>
                        {col.render ? col.render(row) : String(val ?? "—")}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
          >
            ← Prev
          </button>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            Page {safePage} of {totalPages}
          </span>
          <button
            className="btn"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

/** Inline status badge used in table cells */
export function StatusBadge({ status }: { status?: unknown }) {
  if (!status) return <span className="chip muted">—</span>;
  const s = String(status).toLowerCase();
  let cls = "chip muted";
  if (["paid", "active", "open", "completed", "submitted"].some((k) => s.includes(k))) cls = "chip ok";
  else if (["unpaid", "overdue", "draft", "pending"].some((k) => s.includes(k))) cls = "chip warn";
  else if (["cancelled", "failed", "expired", "suspended"].some((k) => s.includes(k))) cls = "chip danger";
  else if (["in progress", "running", "queued"].some((k) => s.includes(k))) cls = "chip info";
  return <span className={cls}>{String(status)}</span>;
}
