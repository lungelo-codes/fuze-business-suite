import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";
export default async function Page() { const config = getCrudConfig("audit-trail"); const rows = await getCrudRows("audit-trail"); if (!config) return <div>Unknown module</div>; return <CrudModulePage moduleId="audit-trail" config={config} initialRows={rows} />; }
