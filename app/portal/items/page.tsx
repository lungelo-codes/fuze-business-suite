import SimpleTable, { StatusCell } from "@/components/SimpleTable";
import { getModuleData } from "@/lib/server/data";

export default async function Page() {
  const data = await getModuleData("items");

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Items</h1>
          <div className="page-sub">Item records from ERPNext</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Items</h3>
        </div>
        <div className="card-body">
          <SimpleTable
            data={data}
            columns={[
              { key: "name", label: "Item" },
{ key: "item_name", label: "Name" },
{ key: "item_group", label: "Group" },
{ key: "stock_uom", label: "UOM" },
{ key: "disabled", label: "Disabled" }
            ]}
          />
        </div>
      </div>
    </div>
  );
}
