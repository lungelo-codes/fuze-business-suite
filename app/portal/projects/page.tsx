import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";

export default async function Page() {
  const config = getCrudConfig("projects");
  const rows = await getCrudRows("projects");
  if (!config) return <div>Unknown module</div>;
  return <CrudModulePage moduleId="projects" config={config} initialRows={rows} />;
}
