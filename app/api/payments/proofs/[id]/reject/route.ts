import { NextResponse } from "next/server";
import { rejectPaymentProof } from "@/lib/server/finance";
export async function POST(req: Request, { params }: { params: { id: string } }) { try { const b = await req.json().catch(() => ({})); return NextResponse.json(await rejectPaymentProof(decodeURIComponent(params.id), b.reason)); } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 }); } }
