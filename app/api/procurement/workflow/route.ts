import { fuzeData } from "@/lib/server/fuzeApi";

type Row = Record<string, unknown>;

export async function GET(): Promise<Response> {
  const [dashboard, suppliers, purchaseOrders, lowStock] = await Promise.all([
    fuzeData<Row>("fuze_suite.api.procurement.get_dashboard", {}, {}),
    fuzeData<Row>("fuze_suite.api.procurement.get_suppliers", {}, {}),
    fuzeData<Row>("fuze_suite.api.procurement.get_purchase_orders", {}, {}),
    fuzeData<Row>("fuze_suite.api.procurement.get_low_stock", {}, {}),
  ]);
  return Response.json({ success: true, data: { dashboard, suppliers, purchaseOrders, lowStock } });
}
