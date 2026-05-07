import { NextResponse } from "next/server";
import { listPaymentProofs, submitPaymentProof } from "@/lib/server/finance";
export async function GET(req: Request) { try { const u = new URL(req.url); return NextResponse.json(await listPaymentProofs(u.searchParams.get("status") || undefined)); } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 }); } }
export async function POST(req: Request) { try { return NextResponse.json(await submitPaymentProof(await req.json())); } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 }); } }
