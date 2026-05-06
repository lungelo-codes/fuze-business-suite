import { NextResponse } from "next/server";
import { erpLogin, attachERPSetCookie } from "@/lib/server/auth";
import { ROLE_COOKIE, COMPANY_COOKIE } from "@/lib/modules";
import { ERPNEXT_URL_COOKIE } from "@/lib/server/erpnext";

function isAdminEmail(email: string): boolean {
  const admins = (process.env.ADMIN_EMAILS || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  return email.toLowerCase() === "administrator" || admins.includes(email.toLowerCase());
}

export async function POST(req: Request) {
  try {
    const { email, password, site_url, company_name } = (await req.json()) as {
      email: string;
      password: string;
      site_url?: string;
      company_name?: string;
    };

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const { body, setCookie, erpUrl } = await erpLogin(email, password, site_url);
    const role = isAdminEmail(email) ? "admin" : "customer";

    const response = NextResponse.json({ success: true, role, erp_url: erpUrl, body });
    attachERPSetCookie(response, setCookie);

    response.cookies.set(ROLE_COOKIE, role, { httpOnly: false, path: "/", maxAge: 86400 });
    response.cookies.set(ERPNEXT_URL_COOKIE, erpUrl, { httpOnly: false, path: "/", maxAge: 30 * 86400 });
    response.cookies.set("fuze_email", email, { httpOnly: false, path: "/", maxAge: 30 * 86400 });
    if (company_name) response.cookies.set(COMPANY_COOKIE, company_name, { httpOnly: false, path: "/", maxAge: 30 * 86400 });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed" },
      { status: 401 }
    );
  }
}
