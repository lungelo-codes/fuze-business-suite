import { erpList, erpCreate } from "@/lib/server/erpnext";

export async function GET() {
  try {
    const [slaRules, teams, customerPortal] = await Promise.all([
      erpList<Record<string, unknown>>("HD Service Level Agreement", {
        fields: ["name", "sla_name", "entity", "entity_type", "response_time", "resolution_time", "modified"],
        limit: 50,
        orderBy: "modified desc",
      }).catch(() => []),
      erpList<Record<string, unknown>>("HD Team", {
        fields: ["name", "team_name", "modified"],
        limit: 50,
        orderBy: "modified desc",
      }).catch(() => []),
      erpList<Record<string, unknown>>("HD Customer Portal Settings", {
        fields: ["name", "allow_ticket_creation", "modified"],
        limit: 1,
      }).catch(() => []),
    ]);

    const helpdeskInstalled = slaRules.length > 0 || teams.length > 0;

    return Response.json({
      success: true,
      helpdeskInstalled,
      data: { slaRules, teams, customerPortal },
      installGuide: helpdeskInstalled ? null : {
        steps: [
          "bench get-app helpdesk",
          "bench install-app helpdesk --site <your-site>",
          "bench restart",
        ],
        docUrl: "https://docs.frappe.io/helpdesk",
      },
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch SLA data" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { sla_name, entity_type, response_time, resolution_time } = await request.json();

    if (!sla_name) {
      return Response.json({ success: false, error: "sla_name is required" }, { status: 400 });
    }

    const sla = await erpCreate("HD Service Level Agreement", {
      sla_name,
      entity_type: entity_type || "Customer",
      response_time: response_time || 60,
      resolution_time: resolution_time || 480,
    });

    return Response.json({ success: true, data: sla });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create SLA" },
      { status: 500 }
    );
  }
}
