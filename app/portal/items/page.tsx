import SearchTable, { StatusBadge } from "@/components/SearchTable";
import { getModuleData } from "@/lib/server/data";
import { ItemRecord } from "@/lib/types";

export default async function ItemsPage() {
  const data = (await getModuleData("items")) as ItemRecord[];

  const active = data.filter((i) => !i.disabled).length;
  const disabled = data.filter((i) => Number(i.disabled) === 1).length;

  const groupSet = new Set<string>(); data.forEach((i) => { const g = (i as ItemRecord).item_group; if (g) groupSet.add(g); }); const groups = groupSet.size;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Inventory</h1>
          <div className="page-sub">{data.length} item records from ERPNext</div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi teal">
          <div className="ic-wrap">📦</div>
          <div className="label">Total Items</div>
          <div className="val">{data.length}</div>
        </div>
        <div className="kpi">
          <div className="ic-wrap">✓</div>
          <div className="label">Active</div>
          <div className="val">{active}</div>
        </div>
        <div className="kpi warn">
          <div className="ic-wrap">×</div>
          <div className="label">Disabled</div>
          <div className="val">{disabled}</div>
        </div>
        <div className="kpi">
          <div className="ic-wrap">G</div>
          <div className="label">Item Groups</div>
          <div className="val">{groups}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>All Items</h3>
        </div>
        <div className="card-body">
          <SearchTable
            data={data}
            pageSize={25}
            searchPlaceholder="Search by item name, group…"
            columns={[
              {
                key: "item_name",
                label: "Item Name",
                render: (row) => (
                  <span style={{ fontWeight: 600, color: "var(--navy-ink)" }}>
                    {(row as ItemRecord).item_name || row.name}
                  </span>
                ),
              },
              { key: "name", label: "Item ID", render: (row) => <span style={{ fontFamily: "monospace", fontSize: 12 }}>{row.name}</span> },
              { key: "item_group", label: "Group" },
              {
                key: "stock_uom",
                label: "UOM",
                render: (row) => (
                  <span style={{ fontSize: 12 }}>{(row as ItemRecord).stock_uom || "—"}</span>
                ),
              },
              {
                key: "disabled",
                label: "Status",
                render: (row) => {
                  const dis = Number((row as ItemRecord).disabled) === 1;
                  return (
                    <span className={dis ? "chip muted" : "chip ok"}>
                      {dis ? "Disabled" : "Active"}
                    </span>
                  );
                },
              },
              {
                key: "modified",
                label: "Last Updated",
                render: (row) => (
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {String(row.modified ?? "").split(" ")[0] || "—"}
                  </span>
                ),
              },
            ]}
            empty="No items found in ERPNext"
          />
        </div>
      </div>
    </div>
  );
}
