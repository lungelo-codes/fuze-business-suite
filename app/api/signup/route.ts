import { NextResponse } from "next/server";

const ERPNEXT_URL =
  process.env.NEXT_PUBLIC_FUZE_API_URL ||
  process.env.ERPNEXT_URL ||
  "";

interface SignupBody {
  email?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  phone?: string;
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SignupBody;
    const { email, first_name, last_name, company, phone } = body;

    if (!ERPNEXT_URL) return jsonError("ERPNext URL is not configured.", 500);
    if (!email || !first_name) return jsonError("Email and first name are required.", 400);

    const full_name = [first_name, last_name].filter(Boolean).join(" ");

    // Call ERPNext's built-in user registration endpoint — server-side
    const res = await fetch(
      `${ERPNEXT_URL}/api/method/frappe.core.doctype.user.user.sign_up`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          full_name,
          redirect_to: "/portal",
        }),
        cache: "no-store",
      }
    );

    const json = (await res.json()) as { message?: unknown };

    // Frappe returns [flag, message]: 0=exists, 1=success, 2=disabled
    const [flag, msg] = Array.isArray(json.message)
      ? json.message
      : [res.ok ? 1 : 0, json.message];

    if (flag === 0) {
      return jsonError("An account with this email already exists.", 409);
    }
    if (flag === 2) {
      return jsonError(
        "User registration is currently disabled. Please contact support.",
        403
      );
    }
    if (!res.ok || flag === undefined) {
      return jsonError(
        typeof msg === "string" ? msg : "Registration failed. Please try again.",
        500
      );
    }

    return NextResponse.json({
      success: true,
      message:
        typeof msg === "string"
          ? msg
          : "Account created! Check your email to verify your account.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Signup failed",
      },
      { status: 500 }
    );
  }
}
