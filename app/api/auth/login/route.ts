import { NextResponse } from "next/server";
import { ALL_MODULES, COMPANY_COOKIE, MODULE_COOKIE, PLAN_COOKIE, ROLE_COOKIE } from "@/lib/modules";

const ERPNEXT_URL =
  process.env.ERPNEXT_URL ||
  process.env.NEXT_PUBLIC_ERPNEXT_URL ||
  process.env.NEXT_PUBLIC_API_URL;

const ERPNEXT_API_KEY = process.env.ERPNEXT_API_KEY;
const ERPNEXT_API_SECRET = process.env.ERPNEXT_API_SECRET;

type LoginBody = {
  email?: string;
  password?: string;
};

type ParsedCookie = {
  name: string;
  value: string;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function parseSetCookieHeader(header: string | null): ParsedCookie[] {
  if (!header) return [];

  const parts = header.split(/,(?=\s*[^;=]+=[^;]+)/g);

  return parts
    .map((cookie) => cookie.split(";")[0]?.trim())
    .filter(Boolean)
    .map((pair) => {
      const index = pair.indexOf("=");
      return {
        name: pair.slice(0, index),
        value: pair.slice(index + 1),
      };
    })
    .filter((cookie) => cookie.name && cookie.value);
}

async function fetchUserRoles(email: string, sid?: string): Promise<string[]> {
  if (!ERPNEXT_URL) return [];

  if (email === "Administrator") return ["Administrator", "System Manager"];

  const filters = encodeURIComponent(
    JSON.stringify([
      ["parent", "=", email],
      ["role", "in", ["Administrator", "System Manager"]],
    ])
  );
  const fields = encodeURIComponent(JSON.stringify(["role"]));

  const headers: HeadersInit = {};
  if (ERPNEXT_API_KEY && ERPNEXT_API_SECRET) {
    headers.Authorization = `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;
  } else if (sid) {
    headers.Cookie = `sid=${sid}`;
  }

  try {
    const res = await fetch(`${ERPNEXT_URL}/api/resource/Has%20Role?filters=${filters}&fields=${fields}`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: { role?: string }[] };
    return (json.data || []).map((row) => row.role).filter(Boolean) as string[];
  } catch {
    return [];
  }
}

export async function POST(req: Request) {
  try {
    if (!ERPNEXT_URL) {
      return jsonError("Missing ERPNext URL. Set ERPNEXT_URL or NEXT_PUBLIC_API_URL.", 500);
    }

    const { email, password } = (await req.json()) as LoginBody;

    if (!email || !password) {
      return jsonError("Email and password are required.", 400);
    }

    const loginRes = await fetch(`${ERPNEXT_URL}/api/method/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ usr: email, pwd: password }),
      cache: "no-store",
      redirect: "manual",
    });

    const text = await loginRes.text();
    let loginJson: unknown = {};
    try {
      loginJson = text ? JSON.parse(text) : {};
    } catch {
      loginJson = { raw: text };
    }

    const setCookieHeader = loginRes.headers.get("set-cookie");
    const parsedCookies = parseSetCookieHeader(setCookieHeader);
    const sid = parsedCookies.find((cookie) => cookie.name === "sid")?.value;
    const userId = parsedCookies.find((cookie) => cookie.name === "user_id")?.value || email;
    const fullName = parsedCookies.find((cookie) => cookie.name === "full_name")?.value || email;

    if (!loginRes.ok || !sid) {
      return NextResponse.json(
        {
          success: false,
          error: "Login failed. Check your email and password.",
          details: loginJson,
        },
        { status: 401 }
      );
    }

    const roles = await fetchUserRoles(email, sid);
    const isAdmin = email === "Administrator" || roles.includes("Administrator") || roles.includes("System Manager");

    const response = NextResponse.json({
      success: true,
      role: isAdmin ? "admin" : "customer",
      redirectTo: isAdmin ? "/admin" : "/portal",
      user: {
        email,
        full_name: decodeURIComponent(fullName),
        roles,
      },
    });

    const secure = process.env.NODE_ENV === "production";
    const common = {
      httpOnly: false,
      sameSite: "lax" as const,
      secure,
      path: "/",
      maxAge: 60 * 60 * 24,
    };

    response.cookies.set("sid", sid, common);
    response.cookies.set("user_id", userId, common);
    response.cookies.set("full_name", fullName, common);
    response.cookies.set(ROLE_COOKIE, isAdmin ? "admin" : "customer", common);
    response.cookies.set(PLAN_COOKIE, "Business Pro", common);
    response.cookies.set(COMPANY_COOKIE, "Fuze Business Suite", common);
    response.cookies.set(MODULE_COOKIE, encodeURIComponent(JSON.stringify(ALL_MODULES.map((m) => m.id))), common);

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unexpected login error.",
      },
      { status: 500 }
    );
  }
}
