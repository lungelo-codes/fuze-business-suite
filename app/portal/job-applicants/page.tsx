import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";

export default async function Page() {
  const config = getCrudConfig("job-applicants");
  const rows = await getCrudRows("job-applicants").catch(() => []);
  if (!config) return <div>Unknown module</div>;
  return <CrudModulePage moduleId="job-applicants" config={config} initialRows={rows} />;
}
