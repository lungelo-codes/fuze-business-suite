import { NextResponse } from "next/server";
import { approvePaymentProof } from "@/lib/server/finance";
export async function POST(req: Request, { params }: { params: { id: string } }) { try { return NextResponse.json(await approvePaymentProof(decodeURIComponent(params.id), await req.json())); } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 }); } }
