import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
export async function GET(req: Request){try{const p=new URL(req.url).searchParams;const args:any={}; if(p.get("limit"))args.limit=Number(p.get("limit")); if(p.get("offset"))args.offset=Number(p.get("offset")); return NextResponse.json(await erpMethod("compliance.get_audit_log",args));}catch(e:any){return NextResponse.json({error:e?.message||"Failed to fetch audit log"},{status:500});}}
