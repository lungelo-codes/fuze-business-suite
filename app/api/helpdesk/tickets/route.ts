import { erpList, erpCreate, erpPatch } from "@/lib/server/erpnext";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const priority = url.searchParams.get("priority");

    const filters: unknown[] = [];
    if (status) filters.push(["HD Ticket", "status", "=", status]);
    if (priority) filters.push(["HD Ticket", "priority", "=", priority]);

    const [hdTickets, issues] = await Promise.all([
      erpList<Record<string, unknown>>("HD Ticket", {
        fields: ["name", "subject", "status", "priority", "customer", "raised_by", "agent_assigned", "sla", "response_by", "resolution_by", "creation", "modified"],
        filters,
        limit: 200,
        orderBy: "modified desc",
      }).catch(() => []),
      // Fallback: ERPNext Issue doctype if Frappe Helpdesk not installed
      erpList<Record<string, unknown>>("Issue", {
        fields: ["name", "subject", "customer", "status", "priority", "raised_by", "modified"],
        limit: 200,
        orderBy: "modified desc",
      }).catch(() => []),
    ]);

    const data = hdTickets.length ? hdTickets : issues;
    const source = hdTickets.length ? "frappe_helpdesk" : "erpnext_issue";

    return Response.json({ success: true, data, source });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { subject, description, customer, raised_by, priority, agent_assigned, sla } = await request.json();

    if (!subject) {
      return Response.json({ success: false, error: "Subject is required" }, { status: 400 });
    }

    // Try HD Ticket first; if Frappe Helpdesk not installed it will throw and we fall back
    try {
      const ticket = await erpCreate("HD Ticket", {
        subject, description: description || "",
        customer: customer || null, raised_by: raised_by || null,
        priority: priority || "Medium", agent_assigned: agent_assigned || null,
        sla: sla || null, status: "Open",
      });
      return Response.json({ success: true, data: ticket, source: "frappe_helpdesk" });
    } catch {
      // Fallback to ERPNext Issue
      const issue = await erpCreate("Issue", {
        subject, description: description || "",
        customer: customer || null, raised_by: raised_by || null,
        priority: priority || "Medium", issue_type: "General",
      });
      return Response.json({ success: true, data: issue, source: "erpnext_issue" });
    }
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create ticket" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { name, status, priority, agent_assigned, doctype = "HD Ticket" } = await request.json();
    if (!name) return Response.json({ success: false, error: "Name is required" }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (agent_assigned !== undefined) updates.agent_assigned = agent_assigned;

    await erpPatch(doctype, name, updates);
    return Response.json({ success: true, message: "Ticket updated" });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update ticket" },
      { status: 500 }
    );
  }
}
