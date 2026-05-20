import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
import { requireSaaSUser, safeJsonError, tenantArgs } from "@/lib/server/apiGuard";

export async function GET(req: Request) {
  try {
    const session = requireSaaSUser();
    const { searchParams } = new URL(req.url);
    const args: Record<string, string | number> = {};
    for (const key of ["customer", "lead", "deal", "limit"]) {
      const value = searchParams.get(key);
      if (!value) continue;
      args[key] = key === "limit" ? Number(value) : value;
    }
    const result = await erpMethod("fuze_suite.api.crm.get_customer_360", tenantArgs(args, session));
    return NextResponse.json({ ok: true, data: result });
  } catch (error: unknown) {
    return safeJsonError(error, "Could not load customer 360.");
  }
}
