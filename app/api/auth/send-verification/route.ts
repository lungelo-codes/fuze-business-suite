import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
import { createVerificationCode, signVerification, VERIFY_COOKIE } from "@/lib/server/verification";

function isEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; full_name?: string; company_name?: string };
    if (!isEmail(body.email)) {
      return NextResponse.json({ error: "Valid email address is required" }, { status: 400 });
    }

    const code = createVerificationCode();
    const expiresAt = Date.now() + 15 * 60 * 1000;
    const token = signVerification(body.email, code, expiresAt);
    const name = body.full_name?.trim() || "there";
    const company = body.company_name?.trim() || "your business";

    const subject = "Verify your Fuze Business Suite email";
    const content = `
      <p>Hello ${name},</p>
      <p>Your verification code for <b>${company}</b> is:</p>
      <p style="font-size:28px;font-weight:800;letter-spacing:4px;margin:18px 0;">${code}</p>
      <p>This code expires in 15 minutes.</p>
      <p>Regards,<br>Fuze Digital</p>
    `;

    await erpMethod("frappe.core.doctype.communication.email.make", {
      recipients: body.email,
      subject,
      content,
      send_email: 1,
      now: 1,
    });

    const response = NextResponse.json({ success: true, message: "Verification code sent" });
    response.cookies.set(VERIFY_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 15 * 60,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send verification email" },
      { status: 500 }
    );
  }
}
