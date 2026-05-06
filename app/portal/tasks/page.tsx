import SearchTable, { StatusBadge } from "@/components/SearchTable";
import { getModuleData } from "@/lib/server/data";
import { TaskRecord } from "@/lib/types";

function PriorityBadge({ priority }: { priority?: string }) {
  if (!priority) return <span className="chip muted">—</span>;
  const p = priority.toLowerCase();
  const cls = p === "urgent" ? "chip danger" : p === "high" ? "chip warn" : p === "medium" ? "chip info" : "chip muted";
  return <span className={cls}>{priority}</span>;
}

export default async function TasksPage() {
  const data = (await getModuleData("tasks")) as TaskRecord[];

  const open = data.filter((t) => t.status === "Open").length;
  const completed = data.filter((t) => t.status === "Completed").length;
  const overdue = data.filter((t) => t.status === "Overdue").length;
  const urgent = data.filter((t) => t.priority === "Urgent").length;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Tasks</h1>
          <div className="page-sub">{data.length} task records from ERPNext</div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi teal">
          <div className="ic-wrap">✅</div>
          <div className="label">Total Tasks</div>
          <div className="val">{data.length}</div>
        </div>
        <div className="kpi">
          <div className="ic-wrap">▶</div>
          <div className="label">Open</div>
          <div className="val">{open}</div>
        </div>
        <div className="kpi">
          <div className="ic-wrap">✓</div>
          <div className="label">Completed</div>
          <div className="val">{completed}</div>
        </div>
        <div className="kpi warn">
          <div className="ic-wrap">!</div>
          <div className="label">Urgent</div>
          <div className="val">{urgent}</div>
          <div className="hint">{overdue} overdue</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>All Tasks</h3>
        </div>
        <div className="card-body">
          <SearchTable
            data={data}
            pageSize={25}
            searchPlaceholder="Search by subject, project, status…"
            columns={[
              {
                key: "subject",
                label: "Task",
                render: (row) => (
                  <span style={{ fontWeight: 600, color: "var(--navy-ink)" }}>
                    {(row as TaskRecord).subject || row.name}
                  </span>
                ),
              },
              {
                key: "project",
                label: "Project",
                render: (row) => (
                  <span style={{ fontSize: 12 }}>{(row as TaskRecord).project || "—"}</span>
                ),
              },
              {
                key: "priority",
                label: "Priority",
                render: (row) => <PriorityBadge priority={(row as TaskRecord).priority} />,
              },
              {
                key: "status",
                label: "Status",
                render: (row) => <StatusBadge status={(row as TaskRecord).status} />,
              },
              {
                key: "exp_start_date",
                label: "Start",
                render: (row) => (
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {(row as TaskRecord).exp_start_date || "—"}
                  </span>
                ),
              },
              {
                key: "exp_end_date",
                label: "Due",
                render: (row) => (
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {(row as TaskRecord).exp_end_date || "—"}
                  </span>
                ),
              },
            ]}
            empty="No tasks found in ERPNext"
          />
        </div>
      </div>
    </div>
  );
}
