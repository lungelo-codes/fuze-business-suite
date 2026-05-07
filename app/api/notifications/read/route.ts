import { NextRequest, NextResponse } from "next/server";
import { erpPatch } from "@/lib/server/erpnext";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body.id || "");
    const source = String(body.source || "");
    if (!id) return NextResponse.json({ ok: false, message: "Missing notification id" }, { status: 400 });
    if (source === "Notification Log") await erpPatch("Notification Log", id, { read: 1 });
    if (source === "ToDo") await erpPatch("ToDo", id, { status: "Closed" });
    if (source === "Fuze Compliance Reminder") await erpPatch("Fuze Compliance Reminder", id, { sent: 1 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not update notification" }, { status: 200 });
  }
}
