import CrmPipelineClient from "@/components/crm/CrmPipelineClient";
import { erpList } from "@/lib/server/erpnext";

type Row = Record<string, unknown>;

async function safeCrmList(doctype: "Lead" | "Opportunity", fieldGroups: string[][]): Promise<Row[]> {
  for (const fields of fieldGroups) {
    try {
      return await erpList<Row>(doctype, { fields, limit: 100, orderBy: "modified desc" });
    } catch (error) {
      // Keep trying smaller ERPNext-safe field sets. Some sites restrict fields in list queries.
    }
  }
  return [];
}

export default async function Page() {
  const [leads, opportunities] = await Promise.all([
    safeCrmList("Lead", [
      ["name", "lead_name", "company_name", "status", "email_id", "mobile_no", "territory", "modified"],
      ["name", "lead_name", "company_name", "status", "email_id", "modified"],
      ["name", "lead_name", "status", "modified"],
      ["name", "modified"],
    ]),
    safeCrmList("Opportunity", [
      ["name", "party_name", "opportunity_from", "status", "opportunity_amount", "expected_closing", "modified"],
      ["name", "party_name", "status", "modified"],
      ["name", "modified"],
    ]),
  ]);
  return <CrmPipelineClient initialLeads={leads} initialOpportunities={opportunities} />;
}
