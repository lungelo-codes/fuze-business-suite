import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
import { requireSaaSUser, safeJsonError, tenantArgs } from "@/lib/server/apiGuard";

export async function POST(req: Request) {
  try {
    const session = requireSaaSUser();
    const body = await req.json() as { currentPassword?: string; newPassword?: string };
    if (!body.currentPassword || !body.newPassword) return NextResponse.json({ ok: false, error: "Current and new password are required" }, { status: 400 });
    await erpMethod("fuze_suite.api.portal.change_password", tenantArgs({ current_password: body.currentPassword, new_password: body.newPassword }, session));
    return NextResponse.json({ ok: true, success: true });
  } catch (error: unknown) {
    return safeJsonError(error, "Password change failed.");
  }
}
