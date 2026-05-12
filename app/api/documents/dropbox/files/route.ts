import { NextResponse } from "next/server";

function cookie(req: Request, name: string) {
  return req.headers.get("cookie")?.split(";").map((v) => v.trim()).find((v) => v.startsWith(`${name}=`))?.split("=").slice(1).join("=");
}

export async function GET(req: Request) {
  const token = cookie(req, "dropbox_access_token");
  if (!token) return NextResponse.json({ connected: false, data: [] });

  const res = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${decodeURIComponent(token)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path: "", recursive: false, include_media_info: false, include_deleted: false, include_has_explicit_shared_members: false }),
    cache: "no-store",
  });

  if (!res.ok) return NextResponse.json({ connected: false, data: [], error: "Could not read Dropbox files" }, { status: 401 });
  const json = await res.json();
  return NextResponse.json({ connected: true, data: json.entries || [] });
}
