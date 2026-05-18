import { NextResponse } from "next/server";
export async function GET(req: Request) {
  const url = new URL(req.url);
  return NextResponse.json({ ok: true, provider: url.searchParams.get("provider"), message: "OAuth callback route is ready for provider token exchange." });
}
