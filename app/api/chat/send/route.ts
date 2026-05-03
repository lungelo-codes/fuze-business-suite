import { NextResponse } from "next/server";
import { erpCreate } from "@/lib/server/erpnext";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    if (!body.content) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    const backend = await erpCreate("Communication", {
      subject: body.subject || "Portal Message",
      content: body.content,
      communication_type: "Comment",
      sender: body.sender || "",
      reference_doctype: body.reference_doctype || "",
      reference_name: body.reference_name || ""
    });

    return NextResponse.json({ success: true, backend });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send message" },
      { status: 500 }
    );
  }
}
