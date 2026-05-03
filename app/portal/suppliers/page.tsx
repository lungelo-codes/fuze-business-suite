import SimpleTable, { StatusCell } from "@/components/SimpleTable";
import { getModuleData } from "@/lib/server/data";

export default async function Page() {
  const data = await getModuleData("suppliers");

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Suppliers</h1>
          <div className="page-sub">Supplier records from ERPNext</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Suppliers</h3>
        </div>
        <div className="card-body">
          <SimpleTable
            data={data}
            columns={[
              { key: "name", label: "Supplier" },
{ key: "supplier_name", label: "Name" },
{ key: "supplier_group", label: "Group" },
{ key: "supplier_type", label: "Type" }
            ]}
          />
        </div>
      </div>
    </div>
  );
}
