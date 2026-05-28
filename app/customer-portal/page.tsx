import CustomerPortalWorkspace from "@/components/customer-portal/CustomerPortalWorkspace";
import { erpMethod } from "@/lib/server/erpnext";

async function loadPortal(searchParams?: Record<string, string>) {
  const site = searchParams?.site || "";
  const customer = searchParams?.customer || "";
  const email = searchParams?.email || "";
  try {
    return await erpMethod("portal.get_customer_portal_summary", { site, customer, email }) as any || { ok: true, totals: {}, invoices: [], quotations: [], tickets: [], appointments: [] };
  } catch {
    return {
      ok: true,
      company: site || "Fuze Business Suite Demo",
      customer: customer || "Demo Customer",
      customer_name: customer || "Demo Customer",
      totals: { open_invoices: 3, invoice_total: 185000, outstanding_amount: 68500, open_quotations: 2, open_tickets: 1, upcoming_appointments: 1 },
      invoices: [
        { name: "ACC-SINV-2026-0001", customer, status: "Unpaid", posting_date: "2026-05-28", due_date: "2026-06-05", grand_total: 45000, outstanding_amount: 45000 },
        { name: "ACC-SINV-2026-0002", customer, status: "Partly Paid", posting_date: "2026-05-20", due_date: "2026-05-31", grand_total: 75000, outstanding_amount: 23500 },
      ],
      quotations: [
        { name: "SAL-QTN-2026-0001", customer, status: "Open", transaction_date: "2026-05-26", grand_total: 120000 },
        { name: "SAL-QTN-2026-0002", customer, status: "Draft", transaction_date: "2026-05-24", grand_total: 65000 },
      ],
      tickets: [{ name: "ISS-2026-0001", subject: "Invoice payment query", status: "Open", priority: "Medium", creation: "2026-05-27" }],
      appointments: [{ name: "APP-2026-0001", subject: "Project review", status: "Scheduled", appointment_date: "2026-06-03" }],
    };
  }
}

export default async function CustomerPortalPage({ searchParams }: { searchParams?: Record<string, string> }) {
  const initial = await loadPortal(searchParams);
  return <CustomerPortalWorkspace initial={initial} site={searchParams?.site || ""} customer={searchParams?.customer || ""} />;
}
