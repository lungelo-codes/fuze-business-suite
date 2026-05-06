import type { ReactNode } from "react";
import StatusChip from "./StatusChip";

export interface Column<T extends object> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface SimpleTableProps<T extends object> {
  data: T[];
  columns: Column<T>[];
  empty?: string;
}

function getValue<T extends object>(row: T, key: keyof T | string): unknown {
  const record = row as unknown as Record<string, unknown>;
  return record[String(key)];
}

function cellValue(value: unknown): ReactNode {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

/**
 * Server-safe table component.
 *
 * Do not add "use client" here. Server pages may pass render callbacks because
 * this component renders on the server and does not serialize functions into a
 * Client Component. If a client page imports this component, it becomes part of
 * that client bundle and the callbacks remain client-side.
 */
export default function SimpleTable<T extends object>({
  data,
  columns,
  empty = "No records found.",
}: SimpleTableProps<T>) {
  return (
    <table className="data">
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={String(column.key)}>{column.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan={columns.length}>
              <div className="empty">{empty}</div>
            </td>
          </tr>
        ) : (
          data.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => {
                const value = getValue(row, column.key);
                return (
                  <td key={String(column.key)} className={column.className}>
                    {column.render ? column.render(row) : cellValue(value)}
                  </td>
                );
              })}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

export function StatusCell({ status }: { status?: unknown }) {
  const safeStatus =
    status === undefined || status === null || status === ""
      ? undefined
      : String(status);

  return <StatusChip status={safeStatus} />;
}
