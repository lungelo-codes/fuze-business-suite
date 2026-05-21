import { NextResponse } from "next/server";
import { erpMethod, BusinessSuiteError } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const result = await erpMethod<any>("settings.list_industry_options", {
      search: searchParams.get("q") || "",
      limit: Number(searchParams.get("limit") || 50),
    });
    const options = result?.options || result?.data?.options || [];
    return NextResponse.json({ data: { options } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not load industry options" }, { status: e instanceof BusinessSuiteError ? e.status : 500 });
  }
}
