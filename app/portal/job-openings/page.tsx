import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";

export default async function Page() {
  const config = getCrudConfig("job-openings");
  const rows = await getCrudRows("job-openings").catch(() => []);
  if (!config) return <div>Unknown module</div>;
  return <CrudModulePage moduleId="job-openings" config={config} initialRows={rows} />;
}
