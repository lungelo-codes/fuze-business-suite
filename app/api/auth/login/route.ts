import { NextResponse } from "next/server";

const ERPNEXT_URL =
  process.env.NEXT_PUBLIC_FUZE_API_URL ||
  process.env.ERPNEXT_URL ||
  "";

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
  const parts = header.split(/,(?=\s*[^;=]+=)/g);
  return parts
    .map((cookie) => cookie.split(";")[0]?.trim())
    .filter(Boolean)
    .map((pair) => {
      const index = pair.indexOf("=");
      return { name: pair.slice(0, index).trim(), value: pair.slice(index + 1).trim() };
    })
    .filter((c) => c.name && c.value);
}

export async function POST(req: Request) {
  try {
    const { email, password } = (await req.json()) as LoginBody;

    if (!ERPNEXT_URL) return jsonError("ERPNext URL is not configured.", 500);
    if (!email || !password) return jsonError("Email and password are required.", 400);

    // Call ERPNext login directly — server-side so credentials never touch the browser
    const loginRes = await fetch(`${ERPNEXT_URL}/api/method/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ usr: email, pwd: password }),
      cache: "no-store",
      redirect: "manual",
    });

    const text = await loginRes.text();
    let loginJson: Record<string, unknown> = {};
    try {
      loginJson = text ? JSON.parse(text) : {};
    } catch {
      loginJson = { raw: text };
    }

    // Extract sid and user info from ERPNext Set-Cookie headers
    const rawSetCookie = loginRes.headers.get("set-cookie");
    const parsedCookies = parseSetCookieHeader(rawSetCookie);
    const sid = parsedCookies.find((c) => c.name === "sid")?.value;
    const userId = parsedCookies.find((c) => c.name === "user_id")?.value || email;
    const fullName = parsedCookies.find((c) => c.name === "full_name")?.value || email;

    if (!loginRes.ok || !sid || sid === "Guest") {
      return NextResponse.json(
        {
          success: false,
          error:
            (loginJson as { message?: string }).message ||
            "Login failed. Check your email and password.",
        },
        { status: 401 }
      );
    }

    const secure = process.env.NODE_ENV === "production";
    const cookieOpts = {
      httpOnly: false,
      sameSite: "lax" as const,
      secure,
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    };

    const response = NextResponse.json({
      success: true,
      redirect: "/portal",
      user: {
        email: userId,
        full_name: decodeURIComponent(fullName),
      },
    });

    // Set session cookies — mirrors what ERPNext sets, but controlled server-side
    response.cookies.set("sid", sid, cookieOpts);
    response.cookies.set("user_id", userId, cookieOpts);
    response.cookies.set("full_name", fullName, cookieOpts);

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
