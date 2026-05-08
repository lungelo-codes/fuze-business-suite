import { NextResponse } from "next/server";
import { erpCreate } from "@/lib/server/erpnext";

function cookie(req: Request, name: string) {
  return req.headers.get("cookie")?.split(";").map((v) => v.trim()).find((v) => v.startsWith(`${name}=`))?.split("=").slice(1).join("=");
}

async function createDropboxSharedLink(req: Request, path?: string) {
  const token = cookie(req, "dropbox_access_token");
  if (!token || !path) return path || "";
  const res = await fetch("https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings", {
    method: "POST",
    headers: { Authorization: `Bearer ${decodeURIComponent(token)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (res.ok && json?.url) return String(json.url);
  if (json?.error?.shared_link_already_exists?.metadata?.url) return String(json.error.shared_link_already_exists.metadata.url);
  return path;
}

type Body = {
  name?: string;
  path_lower?: string;
  url?: string;
  attached_to_doctype?: string;
  attached_to_name?: string;
};

export async function POST(req: Request) {
  const body = await req.json() as Body;
  if (!body.name) return NextResponse.json({ error: "Missing Dropbox file details" }, { status: 400 });

  const link = body.url || await createDropboxSharedLink(req, body.path_lower);
  const doc = await erpCreate("File", {
    file_name: body.name,
    file_url: link || body.name,
    is_private: 0,
    attached_to_doctype: body.attached_to_doctype || undefined,
    attached_to_name: body.attached_to_name || undefined,
  });

  return NextResponse.json({ data: doc });
}
