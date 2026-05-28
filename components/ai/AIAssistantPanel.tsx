"use client";
import { useEffect, useState } from "react";

type AIResult = { provider?: string; title?: string; summary?: string; actions?: string[]; risks?: string[]; confidence?: string };

export default function AIAssistantPanel({ moduleName = "overview", title = "AI Business Assistant" }: { moduleName?: string; title?: string }) {
  const [data, setData] = useState<AIResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");

  async function load(customQuestion?: string) {
    setLoading(true); setError("");
    try {
      const endpoint = customQuestion ? "/api/ai/summary" : `/api/ai/summary?module=${encodeURIComponent(moduleName)}`;
      const res = await fetch(endpoint, {
        method: customQuestion ? "POST" : "GET",
        headers: customQuestion ? { "Content-Type": "application/json" } : undefined,
        body: customQuestion ? JSON.stringify({ module: moduleName, question: customQuestion }) : undefined,
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "AI assistant failed");
      setData(json.ai || null);
    } catch (e) { setError(e instanceof Error ? e.message : "AI assistant failed"); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [moduleName]);

  return <div className="ai-panel demo-panel">
    <div className="demo-panel-head">
      <div><h3>{title}</h3><p>z.ai-powered summaries, risks and recommended actions for this workspace.</p></div>
      <span className="chip ok">{data?.provider === "z.ai" ? "z.ai live" : "AI fallback"}</span>
    </div>
    <div className="ai-panel-body">
      {loading ? <div className="banner info">Generating module summary…</div> : error ? <div className="banner">{error}</div> : data ? <>
        <h4>{data.title || "Module Summary"}</h4>
        <p className="ai-summary">{data.summary}</p>
        <div className="two-col" style={{ alignItems: "start", marginTop: 12 }}>
          <div><strong>Recommended actions</strong><ul className="ai-list">{(data.actions || []).map((item, i) => <li key={i}>{item}</li>)}</ul></div>
          <div><strong>Risks to watch</strong><ul className="ai-list">{(data.risks || []).map((item, i) => <li key={i}>{item}</li>)}</ul></div>
        </div>
      </> : null}
      <div className="ai-question-row">
        <input className="inp" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask AI e.g. How can I improve cash flow this week?" />
        <button className="btn btn-teal" disabled={loading || !question.trim()} onClick={() => load(question)}>Ask AI</button>
      </div>
    </div>
  </div>;
}
