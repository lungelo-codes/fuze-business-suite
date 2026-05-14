import { cookies } from "next/headers";
import DocumentWorkspaceClient from "@/components/documents/DocumentWorkspaceClient";
import { erpList } from "@/lib/server/erpnext";

type ERPFile = {
  name?: string;
  file_name?: string;
  file_url?: string;
  attached_to_doctype?: string;
  attached_to_name?: string;
  modified?: string;
};

export default async function DocumentsPage() {
  let files: ERPFile[] = [];
  try {
    files = await erpList<ERPFile>("File", {
      fields: ["name", "file_name", "file_url", "attached_to_doctype", "attached_to_name", "modified"],
      limit: 100,
      orderBy: "modified desc",
    });
  } catch {
    files = [];
  }

  const cookieStore = cookies();
  const googleConnected = cookieStore.get("gdrive_connected")?.value === "1";
  const dropboxConnected = cookieStore.get("dropbox_connected")?.value === "1";

  return <DocumentWorkspaceClient initialFiles={files} googleConnected={googleConnected} dropboxConnected={dropboxConnected} />;
}
