import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";

export default async function Page() {
  const config = getCrudConfig("hr-loans");
  const rows = await getCrudRows("hr-loans").catch(() => []);
  if (!config) return <div>Unknown module</div>;
  return <CrudModulePage moduleId="hr-loans" config={config} initialRows={rows} />;
}
