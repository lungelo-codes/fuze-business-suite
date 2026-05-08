import { NextResponse } from "next/server";

function cookie(req: Request, name: string) {
  return req.headers.get("cookie")?.split(";").map((v) => v.trim()).find((v) => v.startsWith(`${name}=`))?.split("=").slice(1).join("=");
}

export async function GET(req: Request) {
  const token = cookie(req, "gdrive_access_token");
  if (!token) return NextResponse.json({ connected: false, data: [] });

  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("pageSize", "25");
  url.searchParams.set("fields", "files(id,name,mimeType,webViewLink,modifiedTime,size,iconLink)");
  url.searchParams.set("q", "trashed=false");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${decodeURIComponent(token)}` },
    cache: "no-store",
  });

  if (!res.ok) return NextResponse.json({ connected: false, data: [], error: "Could not read Google Drive files" }, { status: 401 });
  const json = await res.json();
  return NextResponse.json({ connected: true, data: json.files || [] });
}
