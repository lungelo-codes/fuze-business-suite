import { redirect } from "next/navigation";

export default function SalesOrdersRedirect() {
  redirect("/portal/crm?tab=sales-orders");
}
