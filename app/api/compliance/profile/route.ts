import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
export async function GET(req: Request){try{const p=new URL(req.url).searchParams;const args:any={}; if(p.get("company"))args.company=p.get("company"); return NextResponse.json(await erpMethod("compliance.get_sars_profile",args));}catch(e:any){return NextResponse.json({error:e?.message||"Failed to fetch SARS profile"},{status:500});}}
export async function POST(req: Request){try{const body=await req.json().catch(()=>({})); return NextResponse.json(await erpMethod("compliance.save_sars_profile",{data:body}));}catch(e:any){return NextResponse.json({error:e?.message||"Could not save SARS profile"},{status:500});}}
