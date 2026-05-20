import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

type Conn = { access_token?: string };
type Body = { id?: string; name?: string; path_lower?: string; url?: string; attached_to_doctype?: string; attached_to_name?: string };
function unwrap<T>(value: unknown): T { const boxed = value as { data?: T; message?: T }; return (boxed?.data ?? boxed?.message ?? value) as T; }
async function createDropboxSharedLink(token: string | undefined, path?: string) {
  if (!token || !path) return path || "";
  const res = await fetch("https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ path }), cache: "no-store" });
  const json = await res.json().catch(() => null);
  if (res.ok && json?.url) return String(json.url);
  if (json?.error?.shared_link_already_exists?.metadata?.url) return String(json.error.shared_link_already_exists.metadata.url);
  return path;
}
export async function POST(req: Request) {
  const body = await req.json() as Body;
  if (!body.name) return NextResponse.json({ error: "Missing Dropbox file details" }, { status: 400 });
  const conn = unwrap<Conn>(await erpMethod("documents.get_storage_connection", { provider: "dropbox" }) || {});
  const link = body.url || await createDropboxSharedLink(conn.access_token, body.path_lower);
  const result = await erpMethod("documents.attach_cloud_file", { provider: "dropbox", file_name: body.name, file_url: link || body.name, cloud_id: body.id || body.path_lower, attached_to_doctype: body.attached_to_doctype, attached_to_name: body.attached_to_name });
  const boxed = result as { data?: unknown } | null;
  return NextResponse.json({ data: boxed?.data ?? result });
}
