import { NextResponse } from "next/server";
import { erpList } from "@/lib/server/erpnext";
import { format, parseISO } from "date-fns";

interface Invoice {
  name: string;
  posting_date?: string;
  grand_total?: number;
  customer?: string;
  [key: string]: unknown;
}

interface Payment {
  name: string;
  posting_date?: string;
  paid_amount?: number;
  [key: string]: unknown;
}

interface Task {
  name: string;
  status?: string;
  [key: string]: unknown;
}

interface Issue {
  name: string;
  status?: string;
  [key: string]: unknown;
}

interface Customer {
  name: string;
  customer_group?: string;
  [key: string]: unknown;
}

function getMonthKey(dateStr?: string): string {
  if (!dateStr) return "Unknown";
  try {
    return format(parseISO(String(dateStr).split(" ")[0]), "MMM yy");
  } catch {
    return "Unknown";
  }
}

export async function GET() {
  try {
    const [invoices, payments, tasks, issues, customers] = await Promise.all([
      erpList<Invoice>("Sales Invoice", {
        fields: ["name", "posting_date", "grand_total", "customer", "status"],
        limit: 500,
        orderBy: "posting_date asc",
      }),
      erpList<Payment>("Payment Entry", {
        fields: ["name", "posting_date", "paid_amount", "payment_type"],
        limit: 500,
        orderBy: "posting_date asc",
      }),
      erpList<Task>("Task", {
        fields: ["name", "status"],
        limit: 500,
      }),
      erpList<Issue>("Issue", {
        fields: ["name", "status"],
        limit: 500,
      }),
      erpList<Customer>("Customer", {
        fields: ["name", "customer_group"],
        limit: 500,
      }),
    ]);

    // Revenue by month
    const invoiceMonthMap: Record<string, { total: number; count: number }> = {};
    for (const inv of invoices) {
      const key = getMonthKey(inv.posting_date);
      if (!invoiceMonthMap[key]) invoiceMonthMap[key] = { total: 0, count: 0 };
      invoiceMonthMap[key].total += inv.grand_total ?? 0;
      invoiceMonthMap[key].count += 1;
    }
    const invoicesByMonth = Object.entries(invoiceMonthMap)
      .filter(([k]) => k !== "Unknown")
      .slice(-12)
      .map(([month, v]) => ({ month, ...v }));

    // Payments by month
    const paymentMonthMap: Record<string, number> = {};
    for (const p of payments) {
      const key = getMonthKey(p.posting_date);
      paymentMonthMap[key] = (paymentMonthMap[key] ?? 0) + (p.paid_amount ?? 0);
    }
    const paymentsByMonth = Object.entries(paymentMonthMap)
      .filter(([k]) => k !== "Unknown")
      .slice(-12)
      .map(([month, total]) => ({ month, total }));

    // Tasks by status
    const taskStatusMap: Record<string, number> = {};
    for (const t of tasks) {
      const s = t.status || "Unknown";
      taskStatusMap[s] = (taskStatusMap[s] ?? 0) + 1;
    }
    const tasksByStatus = Object.entries(taskStatusMap).map(([status, count]) => ({ status, count }));

    // Support by status
    const issueStatusMap: Record<string, number> = {};
    for (const i of issues) {
      const s = i.status || "Unknown";
      issueStatusMap[s] = (issueStatusMap[s] ?? 0) + 1;
    }
    const supportByStatus = Object.entries(issueStatusMap).map(([status, count]) => ({ status, count }));

    // Top customers by invoice value
    const customerMap: Record<string, number> = {};
    for (const inv of invoices) {
      if (inv.customer) {
        customerMap[inv.customer] = (customerMap[inv.customer] ?? 0) + (inv.grand_total ?? 0);
      }
    }
    const topCustomers = Object.entries(customerMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, total]) => ({ name, total }));

    // Customers by group — now actually populated from Customer doctype
    const groupMap: Record<string, number> = {};
    for (const c of customers) {
      const g = c.customer_group || "Ungrouped";
      groupMap[g] = (groupMap[g] ?? 0) + 1;
    }
    const customersByGroup = Object.entries(groupMap)
      .sort((a, b) => b[1] - a[1])
      .map(([group, count]) => ({ group, count }));

    return NextResponse.json({
      invoicesByMonth,
      paymentsByMonth,
      customersByGroup,
      tasksByStatus,
      topCustomers,
      supportByStatus,
    });
  } catch {
    return NextResponse.json(null, { status: 200 });
  }
}
