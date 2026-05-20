import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

function unwrap(value: unknown): any { const boxed = value as { data?: unknown; message?: unknown }; return boxed?.data ?? boxed?.message ?? value ?? {}; }

export async function GET() {
  const raw = await erpMethod("documents.get_storage_status", {}).catch(() => null);
  const data = unwrap(raw);
  const google = { ...(data.google || {}), configured: Boolean(process.env.GOOGLE_DRIVE_CLIENT_ID && process.env.GOOGLE_DRIVE_CLIENT_SECRET) };
  const dropbox = { ...(data.dropbox || {}), configured: Boolean(process.env.DROPBOX_CLIENT_ID && process.env.DROPBOX_CLIENT_SECRET) };
  return NextResponse.json({ success: true, data: { google, dropbox }, google, dropbox });
}
