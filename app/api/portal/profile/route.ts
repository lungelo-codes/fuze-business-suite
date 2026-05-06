import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { erpPatch, erpMethod } from "@/lib/server/erpnext";

interface UserProfile {
  name?: string;
  full_name?: string;
  email?: string;
  mobile_no?: string;
  phone?: string;
  username?: string;
  user_image?: string;
}

interface MethodResponse {
  message?: UserProfile | string;
}

export async function GET() {
  try {
    const res = await erpMethod<MethodResponse>("frappe.auth.get_logged_user", {});
    return NextResponse.json(res ?? {});
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not fetch profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const allowed = ["full_name", "mobile_no", "phone"];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // Get current user email from session cookie
    const cookieStore = cookies();
    const userId = cookieStore.get("user_id")?.value;
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const updated = await erpPatch<UserProfile>("User", userId, update);
    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update profile" },
      { status: 500 }
    );
  }
}
