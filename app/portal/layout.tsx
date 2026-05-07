import { cookies } from "next/headers";
import PortalShell from "@/components/PortalShell";
import { MODULE_COOKIE, PLAN_COOKIE, COMPANY_COOKIE, ROLE_COOKIE } from "@/lib/modules";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();

  const modulesCookie = cookieStore.get(MODULE_COOKIE)?.value;
  const planCookie = cookieStore.get(PLAN_COOKIE)?.value;
  const companyCookie = cookieStore.get(COMPANY_COOKIE)?.value;
  const roleCookie = cookieStore.get(ROLE_COOKIE)?.value;

  let activeModules: string[] = [];
  try {
    activeModules = modulesCookie ? JSON.parse(decodeURIComponent(modulesCookie)) : [];
  } catch {
    activeModules = [];
  }

  const companyName = companyCookie ? decodeURIComponent(companyCookie) : undefined;
  const role = roleCookie ? decodeURIComponent(roleCookie) : undefined;

  return (
    <PortalShell activeModules={activeModules} companyName={companyName} role={role} plan={planCookie}>
      {children}
    </PortalShell>
  );
}
