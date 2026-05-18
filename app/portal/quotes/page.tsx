import { redirect } from "next/navigation";

export default function QuotesRedirect() {
  redirect("/portal/crm?tab=quotes");
}
