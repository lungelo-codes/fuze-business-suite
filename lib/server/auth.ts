import { cookies } from "next/headers";

export const SESSION_COOKIE = "sid";
export const ROLE_COOKIE = "fuze_role";
export const COMPANY_COOKIE = "fuze_company";
export const FULL_NAME_COOKIE = "fuze_full_name";
export const EMAIL_COOKIE = "fuze_email";
export const TENANT_URL_COOKIE = "fuze_tenant_url";

export function getServerSession() {
  const store = cookies();

  return {
    sid: store.get(SESSION_COOKIE)?.value || "",
    role: store.get(ROLE_COOKIE)?.value || "customer",
    company: store.get(COMPANY_COOKIE)?.value || "",
    fullName: store.get(FULL_NAME_COOKIE)?.value || "",
    email: store.get(EMAIL_COOKIE)?.value || "",
    tenantUrl: store.get(TENANT_URL_COOKIE)?.value || "",
    isLoggedIn: Boolean(store.get(SESSION_COOKIE)?.value || store.get(EMAIL_COOKIE)?.value),
  };
}

export function isAdminRole(role?: string) {
  return role === "admin" || role === "Administrator" || role === "System Manager";
}