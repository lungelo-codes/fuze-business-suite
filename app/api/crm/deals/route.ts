import { erpList, erpPatch } from "@/lib/server/erpnext";

export async function GET() {
  try {
    const deals = await erpList<Record<string, unknown>>("CRM Deal", {
      fields: ["name", "deal_owner", "party_name", "status", "stage", "amount", "expected_closing", "probability", "modified"],
      limit: 100,
      orderBy: "modified desc"
    });

    return Response.json({ success: true, data: deals });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch deals" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name, stage, status } = await request.json();

    if (!name) {
      return Response.json({ success: false, error: "Deal name is required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (stage) updates.stage = stage;
    if (status) updates.status = status;

    await erpPatch("CRM Deal", name, updates);

    return Response.json({ success: true, message: "Deal updated successfully" });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update deal" },
      { status: 500 }
    );
  }
}
