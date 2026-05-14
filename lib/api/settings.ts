import { apiGet, apiPost } from "@/lib/api/client";

export const settingsApi = {
  businessBranding: () => apiGet("/api/settings/business-branding"),
  saveBusinessBranding: (body: Record<string, unknown>) => apiPost("/api/settings/business-branding", body),
  profile: () => apiGet("/api/saas/profile"),
  saveProfile: (body: Record<string, unknown>) => apiPost("/api/saas/profile", body),
};
