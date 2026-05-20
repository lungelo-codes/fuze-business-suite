import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET() {
  const data = await erpMethod("documents.get_storage_status", {});
  return NextResponse.json(data || { google: { connected: false }, dropbox: { connected: false } });
}
