import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";
export default async function Page() { const config = getCrudConfig("cipc"); const rows = await getCrudRows("cipc"); if (!config) return <div>Unknown module</div>; return <CrudModulePage moduleId="cipc" config={config} initialRows={rows} />; }
