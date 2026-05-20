"use client";

import { useEffect, useMemo, useState } from "react";

type Check = { key: string; label: string; area: string; status: "pass" | "fail" | "warn"; detail: string };
type Result = { ok?: boolean; score?: number; summary?: { passed: number; failed: number; warned: number; total: number }; checks?: Check[]; error?: string };

function badge(status: Check["status"]) {
  if (status === "pass") return "chip ok";
  if (status === "warn") return "chip warn";
  return "chip danger";
}

export default function LiveQAClient() {
  const [result, setResult] = useState<Result>({});
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch("/api/qa/live", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      setResult(json);
    } catch {
      setResult({ ok: false, error: "Could not run QA checks." });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { run(); }, []);

  const groups = useMemo(() => {
    const map = new Map<string, Check[]>();
    for (const check of result.checks || []) {
      const arr = map.get(check.area) || [];
      arr.push(check);
      map.set(check.area, arr);
    }
    return Array.from(map.entries());
  }, [result.checks]);

  return (
    <div className="page-shell">
      <div className="page-head">
        <div>
          <p className="eyebrow">Production readiness</p>
          <h1>Live QA</h1>
          <p className="muted">Run these checks while signed in as a normal SaaS user to confirm tenant isolation, permissions, workflows, finance, reports and document delivery.</p>
        </div>
        <button className="btn btn-teal" type="button" onClick={run} disabled={busy}>{busy ? "Checking…" : "Run checks"}</button>
      </div>

      <div className="grid kpi-grid" style={{ marginBottom: 18 }}>
        <div className="card"><div className="eyebrow">Score</div><h2>{result.score ?? 0}%</h2><p className="muted">Target before production: 90%+</p></div>
        <div className="card"><div className="eyebrow">Passed</div><h2>{result.summary?.passed ?? 0}</h2><p className="muted">Checks working for this tenant</p></div>
        <div className="card"><div className="eyebrow">Needs attention</div><h2>{(result.summary?.failed ?? 0) + (result.summary?.warned ?? 0)}</h2><p className="muted">Fix failed/warning checks before rollout</p></div>
      </div>

      {result.error && <div className="card" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>{result.error}</div>}

      {groups.map(([area, checks]) => (
        <div className="card" key={area} style={{ marginBottom: 14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>{area}</h3>
            <span className="muted">{checks.filter(c => c.status === "pass").length}/{checks.length} passed</span>
          </div>
          <div style={{ display:"grid", gap: 10 }}>
            {checks.map((c) => (
              <div key={c.key} style={{ display:"grid", gridTemplateColumns:"160px 1fr", gap:12, alignItems:"start", borderTop:"1px solid var(--line)", paddingTop:10 }}>
                <span className={badge(c.status)}>{c.status.toUpperCase()}</span>
                <div><strong>{c.label}</strong><p className="muted" style={{ margin:"3px 0 0" }}>{c.detail}</p></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
