import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

// PAYE returns endpoint. Lists PAYE returns with optional status filter and
// pagination. Delegates to compliance.list_paye_returns.
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const company = params.get("company") || undefined;
    const status = params.get("status") || undefined;
    const limitStr = params.get("limit");
    const offsetStr = params.get("offset");
    const args: any = {};
    if (company) args.company = company;
    if (status && status !== "all") args.status = status;
    if (limitStr) args.limit = parseInt(limitStr, 10);
    if (offsetStr) args.offset = parseInt(offsetStr, 10);
    const result = await erpMethod("compliance.list_paye_returns", args);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch PAYE returns";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json(await erpMethod("compliance.create_paye_return", { data: body }));
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Could not create PAYE return" }, { status: 500 });
  }
}
