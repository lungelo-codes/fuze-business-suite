import { fuzeData } from "@/lib/server/fuzeApi";

type Row = Record<string, unknown>;

export async function GET(): Promise<Response> {
  const [dashboard, quotations, salesOrders, products] = await Promise.all([
    fuzeData<Row>("fuze_suite.api.sales.get_dashboard", {}, {}),
    fuzeData<Row>("fuze_suite.api.sales.get_quotations", {}, {}),
    fuzeData<Row>("fuze_suite.api.sales.get_sales_orders", {}, {}),
    fuzeData<Row>("fuze_suite.api.sales.get_products", {}, {}),
  ]);
  return Response.json({ success: true, data: { dashboard, quotations, salesOrders, products } });
}
