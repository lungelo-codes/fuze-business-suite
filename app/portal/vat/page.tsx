import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";
export default async function Page() { const config = getCrudConfig("vat"); const rows = await getCrudRows("vat"); if (!config) return <div>Unknown module</div>; return <CrudModulePage moduleId="vat" config={config} initialRows={rows} />; }
