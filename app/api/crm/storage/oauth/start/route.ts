import { NextResponse } from "next/server";
export async function GET(req: Request) {
  const url = new URL(req.url);
  const provider = url.searchParams.get("provider") || "google_drive";
  return NextResponse.json({ ok: false, provider, message: "OAuth start route is wired. Add provider client ID/secret to enable live authorization." });
}
