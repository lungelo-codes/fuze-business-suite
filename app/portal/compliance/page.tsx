import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";
export default async function Page() { const config = getCrudConfig("compliance"); const rows = await getCrudRows("compliance"); if (!config) return <div>Unknown module</div>; return <CrudModulePage moduleId="compliance" config={config} initialRows={rows} />; }
