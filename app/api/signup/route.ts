import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
import { MODULE_COOKIE, PLAN_COOKIE, COMPANY_COOKIE } from "@/lib/modules";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    const required = ["full_name", "company_name", "email", "phone", "password", "preferred_site_name", "plan"];
    const missing = required.filter((field) => !body[field]);

    if (missing.length) {
      return NextResponse.json({ error: `Missing required fields: ${missing.join(", ")}` }, { status: 400 });
    }

    // Pass modules as JSON string to ERPNext
    const payload = {
      ...body,
      modules: Array.isArray(body.modules) ? JSON.stringify(body.modules) : (body.modules || "[]"),
    };

    const backend = await erpMethod("fuze_suite.api.saas.request_demo", payload) as Record<string, unknown> | null;

    const response = NextResponse.json({
      success: true,
      message: "Your Fuze Business Suite demo is being prepared. Login details will be emailed to you.",
      site_url: backend?.site_url || null,
      backend,
    });

    // Set cookies server-side too
    const modules = Array.isArray(body.modules) ? body.modules : [];
    response.cookies.set(MODULE_COOKIE, JSON.stringify(modules), { path: "/", maxAge: 365 * 86400 });
    response.cookies.set(PLAN_COOKIE, String(body.plan || "Starter"), { path: "/", maxAge: 365 * 86400 });
    response.cookies.set(COMPANY_COOKIE, String(body.company_name || ""), { path: "/", maxAge: 365 * 86400 });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Signup failed" },
      { status: 500 }
    );
  }
}
