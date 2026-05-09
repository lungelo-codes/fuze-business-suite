import { erpList } from "@/lib/server/erpnext";

type Row = Record<string, unknown>;

const empty = (): Row[] => [];

export async function GET(): Promise<Response> {
  try {
    const [invoices, purchaseInvoices, payments, journalEntries, assets]: Row[][] = await Promise.all([
      erpList<Row>("Sales Invoice", {
        fields: ["name", "customer", "posting_date", "due_date", "grand_total", "outstanding_amount", "status", "modified"],
        limit: 50,
        orderBy: "modified desc"
      }).catch(empty),
      erpList<Row>("Purchase Invoice", {
        fields: ["name", "supplier", "posting_date", "due_date", "grand_total", "outstanding_amount", "status", "modified"],
        limit: 50,
        orderBy: "modified desc"
      }).catch(empty),
      erpList<Row>("Payment Entry", {
        fields: ["name", "party_type", "party", "posting_date", "paid_amount", "received_amount", "status", "modified"],
        limit: 50,
        orderBy: "modified desc"
      }).catch(empty),
      erpList<Row>("Journal Entry", {
        fields: ["name", "posting_date", "total_debit", "total_credit", "status", "modified"],
        limit: 50,
        orderBy: "modified desc"
      }).catch(empty),
      erpList<Row>("Asset", {
        fields: ["name", "asset_name", "asset_category", "purchase_date", "gross_purchase_amount", "status", "modified"],
        limit: 50,
        orderBy: "modified desc"
      }).catch(empty),
    ]);

    return Response.json({ success: true, data: { invoices, purchaseInvoices, payments, journalEntries, assets } });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch accounting data" },
      { status: 500 }
    );
  }
}
