import { NextResponse } from "next/server";

const ERPNEXT_URL =
  process.env.NEXT_PUBLIC_FUZE_API_URL ||
  process.env.ERPNEXT_URL ||
  "";

export async function POST(req: Request) {
  try {
    const { email } = (await req.json()) as { email?: string };

    if (!ERPNEXT_URL) {
      return NextResponse.json({ success: false, error: "ERPNext URL is not configured." }, { status: 500 });
    }
    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required." }, { status: 400 });
    }

    // Call ERPNext's built-in password reset endpoint — server-side
    const res = await fetch(
      `${ERPNEXT_URL}/api/method/frappe.core.doctype.user.user.reset_password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: email }),
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const json = (await res.json()) as { message?: string };
      return NextResponse.json(
        { success: false, error: json.message || "Could not send reset email." },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Password reset email sent. Check your inbox.",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Reset failed" },
      { status: 500 }
    );
  }
}
