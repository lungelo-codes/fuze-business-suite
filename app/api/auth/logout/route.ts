import { NextResponse } from "next/server";
import { MODULE_COOKIE, PLAN_COOKIE, COMPANY_COOKIE, ROLE_COOKIE, TENANT_COOKIE } from "@/lib/modules";

export async function GET() {
  const response = NextResponse.redirect("https://fuze-business-suite.vercel.app/");

  // FIX: Do NOT clear PLAN_COOKIE or MODULE_COOKIE on logout.
  // The user's chosen plan must persist so that when they log back in
  // the plan is restored even if the backend lookup fails.
  // Only clear session/auth cookies — not billing preference cookies.
  [ROLE_COOKIE, COMPANY_COOKIE, TENANT_COOKIE].forEach((name) => {
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
  });

  // Clear Business Suite backend session cookies
  response.cookies.set("sid", "", { path: "/", maxAge: 0 });
  response.cookies.set("system_user", "", { path: "/", maxAge: 0 });
  response.cookies.set("user_id", "", { path: "/", maxAge: 0 });
  response.cookies.set("user_image", "", { path: "/", maxAge: 0 });

  return response;
}
