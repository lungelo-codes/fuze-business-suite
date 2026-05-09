import { erpList, erpPatch, erpCreate } from "@/lib/server/erpnext";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");

    const filters = status ? [["HD Ticket", "status", "=", status]] : [];

    const tickets = await erpList("HD Ticket", {
      fields: ["name", "title", "status", "priority", "customer", "raised_by", "agent_assigned", "sla", "creation", "modified"],
      filters,
      limit: 100,
      orderBy: "modified desc"
    });

    return Response.json({ success: true, data: tickets });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { title, description, customer, raised_by, priority, status } = await request.json();

    if (!title) {
      return Response.json({ success: false, error: "Ticket title is required" }, { status: 400 });
    }

    const ticket = await erpCreate("HD Ticket", {
      title,
      description: description || "",
      customer: customer || null,
      raised_by: raised_by || null,
      priority: priority || "Medium",
      status: status || "Open"
    });

    return Response.json({ success: true, data: ticket });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create ticket" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { name, status, priority, agent_assigned } = await request.json();

    if (!name) {
      return Response.json({ success: false, error: "Ticket name is required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (agent_assigned) updates.agent_assigned = agent_assigned;

    await erpPatch("HD Ticket", name, updates);

    return Response.json({ success: true, message: "Ticket updated successfully" });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update ticket" },
      { status: 500 }
    );
  }
}
