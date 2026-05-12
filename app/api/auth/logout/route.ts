import { NextResponse } from "next/server";

const ERPNEXT_URL =
  process.env.NEXT_PUBLIC_FUZE_API_URL ||
  process.env.ERPNEXT_URL ||
  "";

export async function POST(req: Request) {
  // Best-effort: tell ERPNext to invalidate the session
  try {
    const sid = req.headers.get("cookie")?.match(/sid=([^;]+)/)?.[1];
    if (ERPNEXT_URL && sid) {
      await fetch(`${ERPNEXT_URL}/api/method/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `sid=${sid}`,
        },
        body: JSON.stringify({}),
        cache: "no-store",
      });
    }
  } catch {
    // Ignore — we always clear cookies regardless
  }

  const response = NextResponse.json({ success: true });

  // Clear all session cookies
  const clear = { path: "/", maxAge: 0 };
  response.cookies.set("sid", "", clear);
  response.cookies.set("user_id", "", clear);
  response.cookies.set("full_name", "", clear);

  return response;
}

// Also support GET for direct link logout
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const response = NextResponse.redirect(new URL("/login", baseUrl));

  const clear = { path: "/", maxAge: 0 };
  response.cookies.set("sid", "", clear);
  response.cookies.set("user_id", "", clear);
  response.cookies.set("full_name", "", clear);

  return response;
}
