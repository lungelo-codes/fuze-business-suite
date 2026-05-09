import { erpList } from "@/lib/server/erpnext";

interface AccountingData {
  invoices: Record<string, unknown>[];
  purchaseInvoices: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  journalEntries: Record<string, unknown>[];
  assets: Record<string, unknown>[];
}

export async function GET(): Promise<Response> {
  try {
    const fallback = (): Record<string, unknown>[] => [];
    const [invoices, purchaseInvoices, payments, journalEntries, assets] = await Promise.all([
      erpList("Sales Invoice", {
        fields: ["name", "customer", "posting_date", "due_date", "grand_total", "outstanding_amount", "status", "modified"],
        limit: 50,
        orderBy: "modified desc"
      }).catch(fallback),
      erpList("Purchase Invoice", {
        fields: ["name", "supplier", "posting_date", "due_date", "grand_total", "outstanding_amount", "status", "modified"],
        limit: 50,
        orderBy: "modified desc"
      }).catch(fallback),
      erpList("Payment Entry", {
        fields: ["name", "party_type", "party", "posting_date", "paid_amount", "received_amount", "status", "modified"],
        limit: 50,
        orderBy: "modified desc"
      }).catch(fallback),
      erpList("Journal Entry", {
        fields: ["name", "posting_date", "total_debit", "total_credit", "status", "modified"],
        limit: 50,
        orderBy: "modified desc"
      }).catch(fallback),
      erpList("Asset", {
        fields: ["name", "asset_name", "asset_category", "purchase_date", "gross_purchase_amount", "status", "modified"],
        limit: 50,
        orderBy: "modified desc"
      }).catch(fallback)
    ]);

    const data: AccountingData = {
      invoices,
      purchaseInvoices,
      payments,
      journalEntries,
      assets
    };

    return Response.json({ success: true, data });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch accounting data" },
      { status: 500 }
    );
  }
}
