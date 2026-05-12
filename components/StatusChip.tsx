interface StatusChipProps {
  status?: string;
}

export default function StatusChip({ status }: StatusChipProps) {
  const value = status || "Unknown";
  const normalized = value.toLowerCase();

  let cls = "muted";
  if (["paid", "submitted", "complete", "completed", "active", "approved", "closed", "resolved"].some((s) => normalized.includes(s))) cls = "ok";
  if (["pending", "draft", "open", "in progress", "unpaid", "sent"].some((s) => normalized.includes(s))) cls = "warn";
  if (["overdue", "failed", "cancelled", "rejected", "urgent"].some((s) => normalized.includes(s))) cls = "danger";

  return <span className={`chip ${cls}`}>{value}</span>;
}
