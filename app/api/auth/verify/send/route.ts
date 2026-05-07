import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createVerificationCode,
  signVerification,
  VERIFY_COOKIE,
} from "@/lib/server/verification";
import { erpMethod } from "@/lib/server/erpnext";

export async function POST(req: Request) {
  try {
    const { email } = (await req.json()) as { email?: string };
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const code = createVerificationCode();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    const token = signVerification(email.toLowerCase(), code, expiresAt);

    // Try to send via Business Suite backend email
    try {
      await erpMethod("frappe.core.doctype.communication.email.make", {
        recipients: email,
        subject: "Your Fuze verification code",
        content: `<p>Your Fuze Business Suite verification code is:</p><h2 style="letter-spacing:6px;font-size:32px;font-weight:900;">${code}</h2><p>This code expires in 10 minutes.</p>`,
        send_email: 1,
      });
    } catch {
      // Business Suite backend email may not be configured — log but don't fail
      console.warn("[verify/send] Business Suite backend email send failed — code:", code);
    }

    const response = NextResponse.json({
      success: true,
      message: "Verification code sent to your email address.",
      // In development, expose the code for testing
      ...(process.env.NODE_ENV !== "production" ? { _dev_code: code } : {}),
    });

    // Store signed token in cookie
    response.cookies.set(VERIFY_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send verification code" },
      { status: 500 }
    );
  }
}
