import { NextResponse } from "next/server";
import { MODULE_COOKIE, PLAN_COOKIE, COMPANY_COOKIE, ROLE_COOKIE } from "@/lib/modules";

export async function GET() {
  const response = NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"));
  
  // Clear all portal cookies
  [MODULE_COOKIE, PLAN_COOKIE, COMPANY_COOKIE, ROLE_COOKIE, "fuze_erp_url", "fuze_email"].forEach((name) => {
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
  });

  // Clear ERPNext session cookie
  response.cookies.set("sid", "", { path: "/", maxAge: 0 });
  response.cookies.set("system_user", "", { path: "/", maxAge: 0 });
  response.cookies.set("user_id", "", { path: "/", maxAge: 0 });
  response.cookies.set("user_image", "", { path: "/", maxAge: 0 });
  
  return response;
}
