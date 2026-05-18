import { redirect } from "next/navigation";

export default function ContractsRedirect() {
  redirect("/portal/crm?tab=contracts");
}
