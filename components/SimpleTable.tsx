import type { ReactNode } from "react";
import StatusChip from "./StatusChip";

export interface Column<T extends object> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => ReactNode;
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

export default function SimpleTable<T extends object>({
  data,
  columns,
  empty = "No records found."
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
                  <td key={String(column.key)}>
                    {column.render ? column.render(row) : String(value ?? "-")}
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
