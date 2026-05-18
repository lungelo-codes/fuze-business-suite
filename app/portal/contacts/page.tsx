import { redirect } from "next/navigation";

export default function ContactsRedirect() {
  redirect("/portal/crm?tab=contacts");
}
