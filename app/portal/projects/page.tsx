import SearchTable, { StatusBadge } from "@/components/SearchTable";
import { getModuleData } from "@/lib/server/data";
import { ProjectRecord } from "@/lib/types";

function ProgressBar({ value }: { value?: number }) {
  const pct = Math.min(100, Math.max(0, Number(value ?? 0)));
  const color = pct === 100 ? "var(--ok)" : pct >= 50 ? "var(--teal)" : "var(--warn)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "var(--line-2)", borderRadius: 3, overflow: "hidden", minWidth: 80 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width .3s" }} />
      </div>
      <span style={{ fontSize: 11, color: "var(--muted)", width: 30 }}>{pct}%</span>
    </div>
  );
}

export default async function ProjectsPage() {
  const data = (await getModuleData("projects")) as ProjectRecord[];

  const active = data.filter((p) => p.status === "Open").length;
  const completed = data.filter((p) => p.status === "Completed").length;
  const avgProgress = data.length
    ? Math.round(data.reduce((sum, p) => sum + (p.percent_complete ?? 0), 0) / data.length)
    : 0;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Projects</h1>
          <div className="page-sub">{data.length} project records from ERPNext</div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi teal">
          <div className="ic-wrap">📊</div>
          <div className="label">Total Projects</div>
          <div className="val">{data.length}</div>
        </div>
        <div className="kpi">
          <div className="ic-wrap">▶</div>
          <div className="label">Active</div>
          <div className="val">{active}</div>
          <div className="hint">Status: Open</div>
        </div>
        <div className="kpi">
          <div className="ic-wrap">✓</div>
          <div className="label">Completed</div>
          <div className="val">{completed}</div>
        </div>
        <div className="kpi warn">
          <div className="ic-wrap">%</div>
          <div className="label">Avg Progress</div>
          <div className="val">{avgProgress}%</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>All Projects</h3>
        </div>
        <div className="card-body">
          <SearchTable
            data={data}
            pageSize={20}
            searchPlaceholder="Search by project name or status…"
            columns={[
              {
                key: "project_name",
                label: "Project",
                render: (row) => (
                  <span style={{ fontWeight: 600, color: "var(--navy-ink)" }}>
                    {(row as ProjectRecord).project_name || row.name}
                  </span>
                ),
              },
              {
                key: "status",
                label: "Status",
                render: (row) => <StatusBadge status={(row as ProjectRecord).status} />,
              },
              {
                key: "percent_complete",
                label: "Progress",
                render: (row) => <ProgressBar value={(row as ProjectRecord).percent_complete} />,
                searchable: false,
              },
              {
                key: "expected_start_date",
                label: "Start",
                render: (row) => (
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {(row as ProjectRecord).expected_start_date || "—"}
                  </span>
                ),
              },
              {
                key: "expected_end_date",
                label: "End",
                render: (row) => (
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {(row as ProjectRecord).expected_end_date || "—"}
                  </span>
                ),
              },
            ]}
            empty="No projects found in ERPNext"
          />
        </div>
      </div>
    </div>
  );
}
