import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";
export default async function Page() { const config = getCrudConfig("paye"); const rows = await getCrudRows("paye"); if (!config) return <div>Unknown module</div>; return <CrudModulePage moduleId="paye" config={config} initialRows={rows} />; }
