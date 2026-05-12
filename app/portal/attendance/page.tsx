import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";
export default async function Page() { const config = getCrudConfig("attendance"); const rows = await getCrudRows("attendance"); if (!config) return <div>Unknown module</div>; return <CrudModulePage moduleId="attendance" config={config} initialRows={rows} />; }
