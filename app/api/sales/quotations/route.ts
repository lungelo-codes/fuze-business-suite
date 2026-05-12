import { NextResponse } from "next/server";
import { salesGetQuotations, salesGetQuotation } from "@/lib/server/apiClient";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const company = searchParams.get("company") || undefined;
    const status = searchParams.get("status") || undefined;
    const limit = Number(searchParams.get("limit") || 50);
    const offset = Number(searchParams.get("offset") || 0);
    const name = searchParams.get("name");

    if (name) {
      const data = await salesGetQuotation(name);
      return NextResponse.json(data);
    }

    const data = await salesGetQuotations({ company, status, limit, offset });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
