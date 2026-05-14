import { cookies } from "next/headers";
import DocumentWorkspaceClient from "@/components/documents/DocumentWorkspaceClient";
import { getDocumentsWorkspace } from "@/lib/server/businessApi";

type ERPFile = {
  name?: string;
  file_name?: string;
  file_url?: string;
  attached_to_doctype?: string;
  attached_to_name?: string;
  modified?: string;
};

export default async function DocumentsPage() {
  const data = await getDocumentsWorkspace();
  const cookieStore = cookies();
  const googleConnected = cookieStore.get("gdrive_connected")?.value === "1";
  const dropboxConnected = cookieStore.get("dropbox_connected")?.value === "1";
  return <DocumentWorkspaceClient initialFiles={data.files as ERPFile[]} googleConnected={googleConnected} dropboxConnected={dropboxConnected} />;
}
