import { NextResponse } from "next/server";
import { getBankReconciliation } from "@/lib/server/finance";
export async function GET() { try { return NextResponse.json(await getBankReconciliation()); } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 }); } }
