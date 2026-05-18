import { redirect } from "next/navigation";

export default function CustomersRedirect() {
  redirect("/portal/crm?tab=customers");
}
