import { NextResponse } from "next/server";
import { erpCreate } from "@/lib/server/erpnext";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    if (!body.subject) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    }

    const backend = await erpCreate("Issue", {
      subject: body.subject,
      description: body.description || "",
      raised_by: body.raised_by || "",
      customer: body.customer || "",
      priority: body.priority || "Medium",
      issue_type: body.issue_type || "General"
    });

    return NextResponse.json({ success: true, backend });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create support ticket" },
      { status: 500 }
    );
  }
}
