import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
export async function GET(req: Request){try{const p=new URL(req.url).searchParams;const args:any={}; for(const k of ["company","status","task_type","limit","offset"]){const v=p.get(k); if(v) args[k]=k==="limit"||k==="offset"?Number(v):v;} return NextResponse.json(await erpMethod("compliance.list_tasks",args));}catch(e:any){return NextResponse.json({error:e?.message||"Failed to fetch compliance tasks"},{status:500});}}
export async function POST(req: Request){try{const body=await req.json().catch(()=>({})); return NextResponse.json(await erpMethod("compliance.create_task",{data:body}));}catch(e:any){return NextResponse.json({error:e?.message||"Could not create compliance task"},{status:500});}}
