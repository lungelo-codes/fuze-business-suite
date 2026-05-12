import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";

export default async function Page() {
  const config = getCrudConfig("tasks");
  const rows = await getCrudRows("tasks");
  if (!config) return <div>Unknown module</div>;
  return <CrudModulePage moduleId="tasks" config={config} initialRows={rows} />;
}
