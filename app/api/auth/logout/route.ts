import { NextResponse } from "next/server";
import { MODULE_COOKIE, PLAN_COOKIE, COMPANY_COOKIE, ROLE_COOKIE, TENANT_COOKIE } from "@/lib/modules";

export async function GET() {
  const response = NextResponse.redirect("https://fuze-business-suite.vercel.app/");
  
  // Clear all portal cookies
  [MODULE_COOKIE, PLAN_COOKIE, COMPANY_COOKIE, ROLE_COOKIE, TENANT_COOKIE].forEach((name) => {
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
  });

  // Clear Business Suite backend session cookie
  response.cookies.set("sid", "", { path: "/", maxAge: 0 });
  response.cookies.set("system_user", "", { path: "/", maxAge: 0 });
  response.cookies.set("user_id", "", { path: "/", maxAge: 0 });
  response.cookies.set("user_image", "", { path: "/", maxAge: 0 });
  
  return response;
}
