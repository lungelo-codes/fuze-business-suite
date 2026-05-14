import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

// Compliance dashboard endpoint. Returns counts of VAT, PAYE, CIPC and upcoming deadlines.
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const company = params.get("company") || undefined;
    const result = await erpMethod("compliance.get_dashboard", company ? { company } : {});
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch compliance dashboard";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}