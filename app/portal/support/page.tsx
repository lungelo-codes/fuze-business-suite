import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";

export default async function Page() {
  const config = getCrudConfig("support");
  const rows = await getCrudRows("support");
  if (!config) return <div>Unknown module</div>;
  return <CrudModulePage moduleId="support" config={config} initialRows={rows} />;
}
