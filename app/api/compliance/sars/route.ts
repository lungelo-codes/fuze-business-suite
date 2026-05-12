import { NextResponse } from "next/server";
import { compGetSarsProfile, compSaveSarsProfile, compListPayeReturns } from "@/lib/server/apiClient";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const company = searchParams.get("company") || undefined;
    const type = searchParams.get("type") || "profile";

    if (type === "paye") {
      const data = await compListPayeReturns({ company, limit: 50 });
      return NextResponse.json(data);
    }

    const data = await compGetSarsProfile(company);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = await compSaveSarsProfile(body);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
