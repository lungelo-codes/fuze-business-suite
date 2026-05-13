import { cookies } from "next/headers";
import { PLAN_COOKIE, COMPANY_COOKIE, MODULE_COOKIE, ROLE_COOKIE } from "@/lib/appModules";
import ProfileEditor from "./ProfileEditor";

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const plan = cookieStore.get(PLAN_COOKIE)?.value ?? "—";
  const company = cookieStore.get(COMPANY_COOKIE)?.value
    ? decodeURIComponent(cookieStore.get(COMPANY_COOKIE)!.value)
    : "—";
  const role = cookieStore.get(ROLE_COOKIE)?.value ?? "customer";
  let modules: string[] = [];
  try {
    const raw = cookieStore.get(MODULE_COOKIE)?.value;
    modules = raw ? JSON.parse(decodeURIComponent(raw)) : [];
  } catch {}

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <div className="page-sub">Portal and account configuration</div>
        </div>
      </div>
      <ProfileEditor company={company} plan={plan} role={role} modules={modules} />
    </div>
  );
}
