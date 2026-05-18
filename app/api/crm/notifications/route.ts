import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const args: Record<string, string | number | boolean> = {};
  const limit = searchParams.get("limit");
  const offset = searchParams.get("offset");
  const unreadOnly = searchParams.get("unread_only");
  if (limit) args.limit = Number(limit);
  if (offset) args.offset = Number(offset);
  if (unreadOnly) args.unread_only = unreadOnly === "1" || unreadOnly === "true";
  try {
    const result = await erpMethod("fuze_suite.api.crm.get_notifications", args);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const result = body?.notification_id
      ? await erpMethod("fuze_suite.api.crm.mark_notification_read", { notification_id: body.notification_id })
      : await erpMethod("fuze_suite.api.crm.mark_all_notifications_read", {});
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update notifications" }, { status: 500 });
  }
}
