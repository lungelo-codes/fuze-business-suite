import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySignedCode, VERIFY_COOKIE } from "@/lib/server/verification";

export async function POST(req: Request) {
  try {
    const { email, code } = (await req.json()) as { email?: string; code?: string };
    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    const cookieStore = cookies();
    const token = cookieStore.get(VERIFY_COOKIE)?.value;

    const valid = verifySignedCode(token, email, code);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid or expired verification code. Please request a new one." },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ success: true, verified: true });

    // Clear the verification cookie
    response.cookies.set(VERIFY_COOKIE, "", { path: "/", maxAge: 0 });

    // Set a short-lived verified flag cookie for the signup flow
    response.cookies.set("fuze_email_verified", email.toLowerCase(), {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30 * 60, // 30 minutes to complete signup
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Verification failed" },
      { status: 500 }
    );
  }
}
