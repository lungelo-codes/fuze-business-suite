import { erpList, erpCreate, erpPatch } from "@/lib/server/erpnext";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const source = url.searchParams.get("source"); // "frappe" | "erpnext" | null (auto)

    const [frappeDeals, crmLeads, frappeContacts] = await Promise.all([
      // Frappe CRM app doctypes
      erpList<Record<string, unknown>>("CRM Deal", {
        fields: ["name", "party_name", "status", "stage", "amount", "deal_owner", "expected_closing", "probability", "modified"],
        limit: 100,
        orderBy: "modified desc",
      }).catch(() => []),
      erpList<Record<string, unknown>>("CRM Lead", {
        fields: ["name", "first_name", "last_name", "email", "mobile_no", "status", "lead_owner", "source", "modified"],
        limit: 100,
        orderBy: "modified desc",
      }).catch(() => []),
      erpList<Record<string, unknown>>("CRM Contact", {
        fields: ["name", "full_name", "email", "mobile_no", "company_name", "modified"],
        limit: 100,
        orderBy: "modified desc",
      }).catch(() => []),
    ]);

    const frappe_crm_active = frappeDeals.length > 0 || crmLeads.length > 0;

    return Response.json({
      success: true,
      frappe_crm_active,
      data: { deals: frappeDeals, leads: crmLeads, contacts: frappeContacts },
      message: frappe_crm_active
        ? "Frappe CRM app is active"
        : "Frappe CRM not installed — using ERPNext Lead/Opportunity doctypes. Install: bench get-app crm && bench install-app crm",
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch CRM data" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const { doctype } = body;

    if (!doctype) {
      return Response.json({ success: false, error: "doctype is required" }, { status: 400 });
    }

    // Supports: CRM Deal, CRM Lead, Lead, Opportunity
    const allowed = ["CRM Deal", "CRM Lead", "Lead", "Opportunity", "Contact"];
    if (!allowed.includes(String(doctype))) {
      return Response.json({ success: false, error: `doctype must be one of: ${allowed.join(", ")}` }, { status: 400 });
    }

    const { doctype: _dt, ...fields } = body;
    const created = await erpCreate(String(doctype), fields as Record<string, unknown>);
    return Response.json({ success: true, data: created });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create CRM record" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { name, doctype = "CRM Deal", ...updates } = await request.json() as Record<string, unknown>;

    if (!name) {
      return Response.json({ success: false, error: "name is required" }, { status: 400 });
    }

    await erpPatch(String(doctype), String(name), updates as Record<string, unknown>);
    return Response.json({ success: true, message: "Record updated" });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update CRM record" },
      { status: 500 }
    );
  }
}
