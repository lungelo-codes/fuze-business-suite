import { NextResponse } from "next/server";
import { erpCreate } from "@/lib/server/erpnext";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    if (!body.subject || !body.starts_on) {
      return NextResponse.json({ error: "Subject and start date are required" }, { status: 400 });
    }

    const backend = await erpCreate("Event", {
      subject: body.subject,
      starts_on: body.starts_on,
      ends_on: body.ends_on || body.starts_on,
      event_type: body.event_type || "Private",
      description: body.description || "",
      status: body.status || "Open"
    });

    return NextResponse.json({ success: true, backend });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create appointment" },
      { status: 500 }
    );
  }
}
