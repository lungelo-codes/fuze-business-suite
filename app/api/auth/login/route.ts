import { NextResponse } from "next/server";
import { erpLogin, attachERPSetCookie } from "@/lib/server/auth";
import { erpGet } from "@/lib/server/erpnext";
import { ROLE_COOKIE } from "@/lib/modules";

interface ERPUserInfo {
  message?: {
    roles?: string[];
    full_name?: string;
    email?: string;
  };
}

export async function POST(req: Request) {
  try {
    const { email, password } = (await req.json()) as { email: string; password: string };

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const { body, setCookie } = await erpLogin(email, password);

    // Try to fetch user roles from ERPNext
    let isAdmin = false;
    try {
      const userInfo = await erpGet<ERPUserInfo>("/api/method/frappe.client.get_value?doctype=User&fieldname=[\"roles\"]&filters={\"name\":\"" + encodeURIComponent(email) + "\"}");
      const roles: string[] = userInfo?.message?.roles || [];
      isAdmin = roles.includes("System Manager") || roles.includes("Administrator");
    } catch {
      // If role check fails, default to non-admin
    }

    const response = NextResponse.json({
      success: true,
      role: isAdmin ? "admin" : "customer",
      body,
    });

    // Set ERPNext session cookie
    attachERPSetCookie(response, setCookie);

    // Set role cookie
    response.cookies.set(ROLE_COOKIE, isAdmin ? "admin" : "customer", {
      httpOnly: false,
      path: "/",
      maxAge: 86400,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed" },
      { status: 401 }
    );
  }
}
