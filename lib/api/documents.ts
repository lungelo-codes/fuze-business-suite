import { apiGet, apiPost } from "@/lib/api/client";

export const documentsApi = {
  workspace: () => apiGet("/api/workspaces/documents"),
  files: () => apiGet("/api/crud/documents"),
  connectGoogleDrive: () => apiPost("/api/documents/google/connect"),
  connectDropbox: () => apiPost("/api/documents/dropbox/connect"),
};
