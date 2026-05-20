import { NextResponse } from "next/server";
import { erpList, erpMethod } from "@/lib/server/erpnext";
import { requireSaaSUser, safeJsonError, tenantArgs } from "@/lib/server/apiGuard";

type Row = Record<string, unknown>;

type DashboardPayload = {
  ok?: boolean;
  cards: Record<string, number>;
  workflow: { key: string; label: string; count: number; doctype: string }[];
  material_requests: Row[];
  rfqs: Row[];
  supplier_quotations: Row[];
  purchase_orders: Row[];
  receipts: Row[];
  purchase_invoices: Row[];
  payments: Row[];
  suppliers: Row[];
  source: "saas-api" | "metadata-fallback";
};

function rows<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  const boxed = value as { data?: T[]; message?: T[]; results?: T[] };
  return (boxed?.data || boxed?.message || boxed?.results || []) as T[];
}

async function list(doctype: string, fields: string[], limit = 80) {
  return erpList<Row>(doctype, { fields, limit, orderBy: "modified desc" }).catch(() => []);
}

function statusCount(list: Row[], status: string) {
  return list.filter((r) => String(r.status || "").toLowerCase().includes(status)).length;
}

export async function GET() {
  try {
    const session = requireSaaSUser();
    const args = tenantArgs({}, session);

    try {
      const live = await erpMethod<DashboardPayload>("procurement.get_dashboard", args);
      if (live) return NextResponse.json(live);
    } catch {
      // Fall back to safe Business Suite CRUD wrapper below.
    }

    const [material_requests, rfqs, supplier_quotations, purchase_orders, receipts, purchase_invoices, payments, suppliers] = await Promise.all([
      list("Material Request", ["name", "material_request_type", "schedule_date", "status", "docstatus", "modified"]),
      list("Request for Quotation", ["name", "transaction_date", "status", "docstatus", "modified"]),
      list("Supplier Quotation", ["name", "supplier", "supplier_name", "transaction_date", "grand_total", "status", "docstatus", "modified"]),
      list("Purchase Order", ["name", "supplier", "supplier_name", "transaction_date", "schedule_date", "grand_total", "status", "docstatus", "modified"]),
      list("Purchase Receipt", ["name", "supplier", "supplier_name", "posting_date", "status", "docstatus", "modified"]),
      list("Purchase Invoice", ["name", "supplier", "supplier_name", "posting_date", "grand_total", "outstanding_amount", "status", "docstatus", "modified"]),
      list("Payment Entry", ["name", "party_type", "party", "posting_date", "paid_amount", "payment_type", "status", "docstatus", "modified"]),
      list("Supplier", ["name", "supplier_name", "supplier_group", "country", "disabled", "modified"]),
    ]);

    const payload: DashboardPayload = {
      ok: true,
      source: "metadata-fallback",
      cards: {
        suppliers: suppliers.length,
        material_requests: material_requests.length,
        rfqs: rfqs.length,
        supplier_quotations: supplier_quotations.length,
        purchase_orders: purchase_orders.length,
        receipts: receipts.length,
        purchase_invoices: purchase_invoices.length,
        unpaid_bills: purchase_invoices.filter((r) => Number(r.outstanding_amount || 0) > 0 || String(r.status || "").toLowerCase().includes("unpaid")).length,
        pending_requests: statusCount(material_requests, "pending") + statusCount(material_requests, "draft"),
      },
      workflow: [
        { key: "material_requests", label: "Material Requests", count: material_requests.length, doctype: "Material Request" },
        { key: "rfqs", label: "RFQs", count: rfqs.length, doctype: "Request for Quotation" },
        { key: "supplier_quotations", label: "Supplier Quotations", count: supplier_quotations.length, doctype: "Supplier Quotation" },
        { key: "purchase_orders", label: "Purchase Orders", count: purchase_orders.length, doctype: "Purchase Order" },
        { key: "receipts", label: "Purchase Receipts", count: receipts.length, doctype: "Purchase Receipt" },
        { key: "purchase_invoices", label: "Purchase Invoices", count: purchase_invoices.length, doctype: "Purchase Invoice" },
        { key: "payments", label: "Supplier Payments", count: payments.length, doctype: "Payment Entry" },
      ],
      material_requests: rows(material_requests),
      rfqs: rows(rfqs),
      supplier_quotations: rows(supplier_quotations),
      purchase_orders: rows(purchase_orders),
      receipts: rows(receipts),
      purchase_invoices: rows(purchase_invoices),
      payments: rows(payments),
      suppliers: rows(suppliers),
    };
    return NextResponse.json(payload);
  } catch (error: unknown) {
    return safeJsonError(error, "Could not load procurement dashboard.");
  }
}
