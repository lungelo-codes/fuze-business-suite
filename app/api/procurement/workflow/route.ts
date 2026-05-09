import { erpList } from "@/lib/server/erpnext";

interface ProcurementData {
  materialRequests: Record<string, unknown>[];
  rfqs: Record<string, unknown>[];
  supplierQuotes: Record<string, unknown>[];
  purchaseOrders: Record<string, unknown>[];
  purchaseReceipts: Record<string, unknown>[];
}

export async function GET(): Promise<Response> {
  try {
    const [materialRequests, rfqs, supplierQuotes, purchaseOrders, purchaseReceipts] = await Promise.all([
      erpList<Record<string, unknown>>("Material Request", {
        fields: ["name", "material_request_type", "status", "creation", "modified"],
        limit: 50,
        orderBy: "modified desc"
      }).catch((): Record<string, unknown>[] => []),
      erpList<Record<string, unknown>>("Request for Quotation", {
        fields: ["name", "status", "creation", "modified"],
        limit: 50,
        orderBy: "modified desc"
      }).catch((): Record<string, unknown>[] => []),
      erpList<Record<string, unknown>>("Supplier Quotation", {
        fields: ["name", "supplier", "rfq_no", "status", "total", "creation", "modified"],
        limit: 50,
        orderBy: "modified desc"
      }).catch((): Record<string, unknown>[] => []),
      erpList<Record<string, unknown>>("Purchase Order", {
        fields: ["name", "supplier", "transaction_date", "status", "grand_total", "modified"],
        limit: 50,
        orderBy: "modified desc"
      }).catch((): Record<string, unknown>[] => []),
      erpList<Record<string, unknown>>("Purchase Receipt", {
        fields: ["name", "supplier", "posting_date", "status", "total", "modified"],
        limit: 50,
        orderBy: "modified desc"
      }).catch((): Record<string, unknown>[] => [])
    ]);

    const data: ProcurementData = {
      materialRequests,
      rfqs,
      supplierQuotes,
      purchaseOrders,
      purchaseReceipts
    };

    return Response.json({ success: true, data });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch procurement data" },
      { status: 500 }
    );
  }
}
