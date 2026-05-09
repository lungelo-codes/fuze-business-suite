import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";
import { erpList } from "@/lib/server/erpnext";
import Link from "next/link";

async function safeList(doctype: string) {
  try { return await erpList<Record<string, unknown>>(doctype, { fields: ["name"], limit: 1 }); }
  catch { return []; }
}

export default async function PayrollPage() {
  const config = getCrudConfig("payroll");

  const [components, structures, assignments] = await Promise.all([
    safeList("Salary Component"),
    safeList("Salary Structure"),
    safeList("Salary Structure Assignment"),
  ]);

  const hasComponents = components.length > 0;
  const hasStructures = structures.length > 0;
  const hasAssignments = assignments.length > 0;

  if (!hasComponents || !hasStructures || !hasAssignments) {
    const steps = [
      { num: 1, label: "Salary Components", description: "Define earnings and deductions — Basic Salary, PAYE, UIF, Travel Allowance, etc.", href: "/portal/salary-components", done: hasComponents },
      { num: 2, label: "Salary Structure", description: "Group components into a reusable structure (e.g. Standard Monthly). One structure can cover many employees.", href: "/portal/salary-structure", done: hasStructures },
      { num: 3, label: "Salary Structure Assignment", description: "Link each employee to a structure with a base salary and effective-from date. ERPNext requires this before any slip can be generated.", href: "/portal/salary-structure-assignment", done: hasAssignments },
    ];

    return (
      <div className="demo-workspace animate-fade-up">
        <section className="demo-module-titlebar">
          <div>
            <div className="demo-eyebrow">People Workspace</div>
            <h1>Payroll Setup Required</h1>
            <p>Complete the three steps below before generating salary slips. Each step saves directly to your business account.</p>
          </div>
        </section>
        <section className="demo-grid" style={{ gridTemplateColumns: "1fr" }}>
          <div className="demo-panel">
            <div className="demo-panel-head"><div><h3>Payroll Configuration</h3><p>Complete in order — each step unlocks the next.</p></div></div>
            <div className="demo-alert-list">
              {steps.map((step) => (
                <Link key={step.num} href={step.done ? "#" : step.href} className="demo-alert" style={{ opacity: step.done ? 0.55 : 1, pointerEvents: step.done ? "none" : "auto" }}>
                  <span style={{ fontWeight: 600 }}>{step.done ? "✅" : `Step ${step.num}`} — {step.label}</span>
                  <span>{step.done ? "Done — already configured for your account." : step.description}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <section className="demo-grid" style={{ gridTemplateColumns: "1fr" }}>
          <div className="demo-panel">
            <div className="demo-panel-head"><div><h3>Why is this required?</h3><p>ERPNext calculates earnings and deductions at slip-generation time using your assigned structure.</p></div></div>
            <div style={{ padding: "1.25rem 1.5rem", color: "var(--text-2)", lineHeight: 1.7 }}>
              <p>When a salary slip is created, ERPNext looks up the <strong>Salary Structure Assignment</strong> for that employee to determine their base pay and which components apply. Without an assignment it rejects the slip entirely.</p>
              <p style={{ marginTop: "0.75rem" }}>This setup is done once per employee. If a salary changes, add a new assignment with the new base and a new effective-from date — previous assignments remain intact for historical slips.</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const rows = await getCrudRows("payroll").catch(() => []);
  if (!config) return <div>Unknown module</div>;
  return <CrudModulePage moduleId="payroll" config={config} initialRows={rows} />;
}
