import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";
export default async function Page() { const config = getCrudConfig("uif"); const rows = await getCrudRows("uif"); if (!config) return <div>Unknown module</div>; return <CrudModulePage moduleId="uif" config={config} initialRows={rows} />; }
