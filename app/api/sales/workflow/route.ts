import { erpList } from "@/lib/server/erpnext";

interface SalesData {
  quotations: Record<string, unknown>[];
  salesOrders: Record<string, unknown>[];
  deliveryNotes: Record<string, unknown>[];
  invoices: Record<string, unknown>[];
  payments: Record<string, unknown>[];
}

export async function GET(): Promise<Response> {
  try {
    const [quotations, salesOrders, deliveryNotes, invoices, payments] = await Promise.all([
      erpList("Quotation", {
        fields: ["name", "party_name", "transaction_date", "valid_till", "grand_total", "status", "modified"],
        limit: 50,
        orderBy: "modified desc"
      }).catch((): Record<string, unknown>[] => []),
      erpList("Sales Order", {
        fields: ["name", "customer", "transaction_date", "delivery_date", "grand_total", "status", "modified"],
        limit: 50,
        orderBy: "modified desc"
      }).catch((): Record<string, unknown>[] => []),
      erpList("Delivery Note", {
        fields: ["name", "customer", "posting_date", "status", "grand_total", "modified"],
        limit: 50,
        orderBy: "modified desc"
      }).catch((): Record<string, unknown>[] => []),
      erpList("Sales Invoice", {
        fields: ["name", "customer", "posting_date", "due_date", "grand_total", "outstanding_amount", "status", "modified"],
        limit: 50,
        orderBy: "modified desc"
      }).catch((): Record<string, unknown>[] => []),
      erpList("Payment Entry", {
        fields: ["name", "party_type", "party", "posting_date", "paid_amount", "status", "modified"],
        filters: [["Payment Entry", "party_type", "=", "Customer"]],
        limit: 50,
        orderBy: "modified desc"
      }).catch((): Record<string, unknown>[] => [])
    ]);

    const data: SalesData = {
      quotations,
      salesOrders,
      deliveryNotes,
      invoices,
      payments
    };

    return Response.json({ success: true, data });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch sales data" },
      { status: 500 }
    );
  }
}
