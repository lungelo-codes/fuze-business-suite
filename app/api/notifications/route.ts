import { NextResponse } from "next/server";
import { erpList } from "@/lib/server/erpnext";

type AnyRecord = Record<string, any>;

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  status: "unread" | "read";
  date?: string;
  href?: string;
  source: string;
  doctype?: string;
  docname?: string;
};

function asText(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function stripHtml(value: unknown): string {
  return asText(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function recordHref(doctype?: string, name?: string): string | undefined {
  if (!doctype || !name) return undefined;
  const map: Record<string, string> = {
    Lead: "/portal/crm?tab=leads",
    Opportunity: "/portal/crm?tab=opportunities",
    Customer: "/portal/customers",
    Quotation: "/portal/quotes",
    "Sales Invoice": "/portal/invoices",
    "Payment Entry": "/portal/payments",
    Task: "/portal/tasks",
    Project: "/portal/projects",
    Employee: "/portal/employees",
    "Fuze Compliance Calendar": "/portal/compliance",
    "Fuze Compliance Reminder": "/portal/compliance-reminders",
    "Fuze VAT Return": "/portal/vat",
    "Fuze PAYE Return": "/portal/paye",
    "Fuze UIF Declaration": "/portal/uif",
    "Fuze SDL Declaration": "/portal/sdl",
    "Fuze CIPC Annual Return": "/portal/cipc"
  };
  return `${map[doctype] || "/portal"}?record=${encodeURIComponent(name)}`;
}

async function loadNotificationLogs(): Promise<NotificationItem[]> {
  const rows = await erpList<AnyRecord>("Notification Log", {
    fields: ["name", "subject", "email_content", "document_type", "document_name", "type", "read", "creation"],
    limit: 20,
    orderBy: "creation desc"
  });
  return rows.map((row) => {
    const doctype = asText(row.document_type);
    const docname = asText(row.document_name);
    const read = row.read === 1 || row.read === "1" || row.read === true;
    return {
      id: asText(row.name),
      title: stripHtml(row.subject) || doctype || "Notification",
      message: stripHtml(row.email_content) || (doctype && docname ? `${doctype} ${docname}` : "New business notification"),
      type: asText(row.type, "Notification"),
      status: read ? "read" : "unread",
      date: asText(row.creation),
      href: recordHref(doctype, docname),
      source: "Notification Log",
      doctype,
      docname
    };
  });
}

async function loadTodos(): Promise<NotificationItem[]> {
  const rows = await erpList<AnyRecord>("ToDo", {
    fields: ["name", "description", "reference_type", "reference_name", "status", "priority", "date", "creation"],
    filters: [["status", "!=", "Closed"]],
    limit: 20,
    orderBy: "creation desc"
  });
  return rows.map((row) => {
    const doctype = asText(row.reference_type);
    const docname = asText(row.reference_name);
    return {
      id: asText(row.name),
      title: stripHtml(row.description) || doctype || "Assigned task",
      message: doctype && docname ? `${doctype} ${docname}` : "Open assignment",
      type: asText(row.priority, "To Do"),
      status: "unread",
      date: asText(row.date || row.creation),
      href: recordHref(doctype, docname),
      source: "ToDo",
      doctype,
      docname
    };
  });
}

async function loadComplianceReminders(): Promise<NotificationItem[]> {
  const rows = await erpList<AnyRecord>("Fuze Compliance Reminder", {
    fields: ["name", "title", "reminder_date", "sent", "compliance_item", "days_before_due"],
    limit: 20,
    orderBy: "reminder_date asc"
  });
  return rows.map((row) => ({
    id: asText(row.name),
    title: asText(row.title, "Compliance reminder"),
    message: row.days_before_due !== undefined ? `${row.days_before_due} days before due` : "Compliance deadline reminder",
    type: "Compliance",
    status: row.sent ? "read" : "unread",
    date: asText(row.reminder_date),
    href: `/portal/compliance-reminders?record=${encodeURIComponent(asText(row.name))}`,
    source: "Fuze Compliance Reminder",
    doctype: "Fuze Compliance Reminder",
    docname: asText(row.name)
  }));
}

export async function GET() {
  const all: NotificationItem[] = [];
  const errors: string[] = [];
  for (const loader of [loadNotificationLogs, loadTodos, loadComplianceReminders]) {
    try { all.push(...await loader()); }
    catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  }
  const deduped = Array.from(new Map(all.map((item) => [`${item.source}:${item.id}`, item])).values())
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
    .slice(0, 30);
  return NextResponse.json({ data: deduped, unread: deduped.filter((item) => item.status === "unread").length, errors });
}
