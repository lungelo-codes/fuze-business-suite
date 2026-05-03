import SimpleTable, { StatusCell } from "@/components/SimpleTable";
import { getModuleData } from "@/lib/server/data";

export default async function Page() {
  const data = await getModuleData("customers");

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Customers</h1>
          <div className="page-sub">Customer records from ERPNext</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Customers</h3>
        </div>
        <div className="card-body">
          <SimpleTable
            data={data}
            columns={[
              { key: "name", label: "ID" },
{ key: "customer_name", label: "Customer" },
{ key: "customer_type", label: "Type" },
{ key: "customer_group", label: "Group" },
{ key: "territory", label: "Territory" }
            ]}
          />
        </div>
      </div>
    </div>
  );
}
