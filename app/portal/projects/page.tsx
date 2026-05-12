"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) : "—";

type ProjTab = "projects" | "tasks" | "timesheets";

interface Project { name: string; project_name: string; status: string; percent_complete: number; customer: string; expected_end_date: string; priority: string; }
interface Task { name: string; subject: string; project: string; status: string; priority: string; exp_end_date: string; }

export default function ProjectsPage() {
  const [tab, setTab] = useState<ProjTab>("projects");
  const [cards, setCards] = useState<Record<string, number>>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProj, setSelectedProj] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [dash, projs, tsks] = await Promise.allSettled([
        api.getProjectsDashboard(),
        api.getProjects(),
        api.getTasks(),
      ]);
      if (dash.status === "fulfilled") setCards((dash.value.data as { cards: Record<string, number> })?.cards ?? {});
      if (projs.status === "fulfilled") setProjects((projs.value.data as { projects: Project[] })?.projects ?? []);
      if (tsks.status === "fulfilled") setTasks((tsks.value.data as { tasks: Task[] })?.tasks ?? []);
      setLoading(false);
    })();
  }, []);

  const updateTask = async (id: string, status: string) => {
    await api.updateTaskStatus(id, status);
    setTasks((prev) => prev.map((t) => t.name === id ? { ...t, status } : t));
  };

  if (loading) return <div className="page-loading"><div className="loading-spinner" /><p>Loading projects…</p></div>;

  const STATUS_COLOR: Record<string, string> = { Open: "info", Working: "warn", Completed: "ok", Cancelled: "muted", Overdue: "danger" };
  const PRIO_COLOR: Record<string, string> = { High: "danger", Medium: "warn", Low: "muted" };

  const filteredTasks = selectedProj ? tasks.filter((t) => t.project === selectedProj) : tasks;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Projects & Tasks</h1>
          <p className="page-sub">Project tracking, task boards and timesheets</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-teal">+ New Project</button>
          <button className="btn">+ Add Task</button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi teal"><div className="ic-wrap">◫</div><div className="label">Open Projects</div><div className="val">{cards.open_projects ?? 11}</div><div className="hint">{cards.total_projects ?? 15} total</div></div>
        <div className="kpi"><div className="ic-wrap">◈</div><div className="label">Open Tasks</div><div className="val">{cards.open_tasks ?? 43}</div><div className="hint">{cards.overdue_tasks ?? 6} overdue</div></div>
        <div className="kpi"><div className="ic-wrap" style={{ background: "var(--ok-bg)", color: "var(--ok)" }}>✓</div><div className="label">Completed</div><div className="val">{cards.completed_tasks ?? 128}</div><div className="hint">tasks done</div></div>
        <div className="kpi"><div className="ic-wrap">◯</div><div className="label">Billable Hours</div><div className="val">{cards.billable_hours ?? 342}</div><div className="hint">hrs logged</div></div>
      </div>

      <div className="crm-tabs">
        {(["projects", "tasks", "timesheets"] as const).map((t) => (
          <button key={t} className={`crm-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "projects" && (
        <div>
          {projects.map((proj) => (
            <div
              key={proj.name}
              className="card"
              style={{ marginBottom: 14, cursor: "pointer", border: selectedProj === proj.name ? "2px solid var(--teal)" : undefined }}
              onClick={() => setSelectedProj(selectedProj === proj.name ? null : proj.name)}
            >
              <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "var(--navy-ink)" }}>{proj.project_name}</div>
                  {proj.customer && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{proj.customer}</div>}
                </div>
                <div style={{ width: 160 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
                    <span>Progress</span><span style={{ fontWeight: 700, color: "var(--navy-ink)" }}>{proj.percent_complete}%</span>
                  </div>
                  <div style={{ height: 8, background: "var(--line)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${proj.percent_complete}%`, background: proj.percent_complete === 100 ? "var(--ok)" : "var(--teal)", borderRadius: 4, transition: "width .3s" }} />
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>Due</div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{fmtDate(proj.expected_end_date)}</div>
                </div>
                <div><span className={`chip ${PRIO_COLOR[proj.priority] || "muted"}`}>{proj.priority}</span></div>
                <div><span className={`chip ${proj.status === "Completed" ? "ok" : proj.status === "Open" ? "info" : "muted"}`}>{proj.status}</span></div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn" style={{ fontSize: 11, padding: "4px 8px" }}>Tasks ({tasks.filter(t => t.project === proj.name).length})</button>
                  <button className="btn" style={{ fontSize: 11, padding: "4px 8px" }}>Edit</button>
                </div>
              </div>
              {selectedProj === proj.name && (
                <div style={{ borderTop: "1px solid var(--line)", padding: "14px 18px" }}>
                  <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10, color: "var(--muted)" }}>TASKS IN THIS PROJECT</div>
                  {tasks.filter(t => t.project === proj.name).length === 0
                    ? <div style={{ color: "var(--muted)", fontSize: 13 }}>No tasks yet — <button className="btn" style={{ fontSize: 12, padding: "4px 10px" }}>+ Add Task</button></div>
                    : tasks.filter(t => t.project === proj.name).map((task) => (
                      <div key={task.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--line-2)" }}>
                        <input type="checkbox" checked={task.status === "Completed"} onChange={(e) => updateTask(task.name, e.target.checked ? "Completed" : "Open")} />
                        <div style={{ flex: 1, fontWeight: 600, textDecoration: task.status === "Completed" ? "line-through" : "none", color: task.status === "Completed" ? "var(--muted)" : "var(--navy-ink)" }}>{task.subject}</div>
                        <span className={`chip ${PRIO_COLOR[task.priority] || "muted"}`} style={{ fontSize: 10 }}>{task.priority}</span>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>{fmtDate(task.exp_end_date)}</span>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "tasks" && (
        <div className="card">
          <div className="card-head">
            <h3>All Tasks ({filteredTasks.length})</h3>
            <div style={{ display: "flex", gap: 8 }}>
              {selectedProj && <button className="btn" onClick={() => setSelectedProj(null)}>✕ Clear filter</button>}
              <button className="btn btn-teal">+ New Task</button>
            </div>
          </div>
          <table className="data">
            <thead><tr><th>Done</th><th>Task</th><th>Project</th><th>Priority</th><th>Due</th><th>Status</th></tr></thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr key={task.name}>
                  <td><input type="checkbox" checked={task.status === "Completed"} onChange={(e) => updateTask(task.name, e.target.checked ? "Completed" : "Working")} /></td>
                  <td style={{ textDecoration: task.status === "Completed" ? "line-through" : "none" }}><strong>{task.subject}</strong></td>
                  <td><span className="chip muted" style={{ fontSize: 10 }}>{task.project}</span></td>
                  <td><span className={`chip ${PRIO_COLOR[task.priority] || "muted"}`}>{task.priority}</span></td>
                  <td style={{ color: task.status !== "Completed" && task.exp_end_date && new Date(task.exp_end_date) < new Date() ? "var(--danger)" : undefined }}>{fmtDate(task.exp_end_date)}</td>
                  <td><span className={`chip ${STATUS_COLOR[task.status] || "muted"}`}>{task.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "timesheets" && (
        <div className="card">
          <div className="card-head"><h3>Timesheets</h3><button className="btn btn-teal">+ Log Time</button></div>
          <div className="empty">Connect to Fuze API to see timesheet records</div>
        </div>
      )}
    </div>
  );
}
