import { erpMethod } from "@/lib/server/erpnext";

export type AISourceRecord = Record<string, unknown>;

export type AISummaryInput = {
  module?: string;
  company?: string;
  question?: string;
  context?: AISourceRecord;
};

const ZAI_API_KEY = process.env.ZAI_API_KEY || process.env.Z_AI_API_KEY || "";
const ZAI_MODEL = process.env.ZAI_MODEL || process.env.Z_AI_MODEL || "glm-4.5";
const ZAI_BASE_URL = (process.env.ZAI_API_BASE_URL || process.env.Z_AI_API_BASE_URL || "https://api.z.ai/api/paas/v4").replace(/\/$/, "");

function safeNumber(value: unknown): number {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function pick(obj: AISourceRecord | undefined, path: string): unknown {
  if (!obj) return undefined;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

function deterministicInsight(moduleName: string, context: AISourceRecord = {}) {
  const cards = (context.cards || context.data || context) as AISourceRecord;
  const overdueInvoices = safeNumber(cards.overdue_invoices || pick(context, "cards.overdue_invoices"));
  const receivables = safeNumber(cards.receivables || pick(context, "cards.receivables"));
  const payables = safeNumber(cards.payables || pick(context, "cards.payables"));
  const openTasks = safeNumber(cards.open_tasks || pick(context, "cards.open_tasks"));
  const customers = safeNumber(cards.customers || pick(context, "cards.customers"));
  const suppliers = safeNumber(cards.suppliers || pick(context, "cards.suppliers"));

  const actions: string[] = [];
  if (overdueInvoices > 0 || receivables > 0) actions.push("Follow up overdue invoices and send payment links to customers with outstanding balances.");
  if (openTasks > 0) actions.push("Review open tasks, assign owners, and close delayed work before adding new jobs.");
  if (payables > 0) actions.push("Check supplier payables and match them against expected cash collections.");
  if (customers === 0 && moduleName.toLowerCase().includes("crm")) actions.push("Capture at least 10 leads/customers so CRM reports become useful.");
  if (suppliers === 0 && moduleName.toLowerCase().includes("buy")) actions.push("Add key suppliers and default payment terms before creating purchase orders.");
  if (!actions.length) actions.push("Keep data up to date, review monthly trends, and compare module activity every week.");

  return {
    provider: "fallback",
    title: `${moduleName || "Business"} AI Summary`,
    summary: `Your ${moduleName || "business"} workspace is ready for AI reporting. I could not reach z.ai from this server, so this summary was generated from live module metrics only.`,
    actions: actions.slice(0, 4),
    risks: [
      overdueInvoices > 0 ? `${overdueInvoices} overdue invoices may affect cash flow.` : "No major overdue-invoice warning detected from the available data.",
      openTasks > 10 ? "There may be too many open tasks for the team to manage comfortably." : "Task load looks manageable from the available data.",
    ],
    confidence: ZAI_API_KEY ? "medium" : "configuration_required",
  };
}

export async function buildModuleContext(moduleName: string, company?: string): Promise<AISourceRecord> {
  const mod = String(moduleName || "overview").toLowerCase();
  const body = company ? { company } : {};
  try {
    if (["overview", "dashboard", "insights", "reports"].includes(mod)) return (await erpMethod("insights.get_business_overview", body)) as AISourceRecord || {};
    if (["crm", "sales"].includes(mod)) return (await erpMethod("insights.get_pipeline_summary", body)) as AISourceRecord || {};
    if (["finance", "accounting"].includes(mod)) return (await erpMethod("insights.get_business_overview", body)) as AISourceRecord || {};
    if (["projects", "operations"].includes(mod)) return (await erpMethod("projects.dashboard", body)) as AISourceRecord || {};
    if (["hr", "people"].includes(mod)) return (await erpMethod("hr.dashboard", body)) as AISourceRecord || {};
    if (["support", "helpdesk"].includes(mod)) return (await erpMethod("helpdesk.dashboard", body)) as AISourceRecord || {};
    return (await erpMethod("insights.get_business_overview", body)) as AISourceRecord || {};
  } catch {
    return {};
  }
}

export async function askZAI(input: AISummaryInput) {
  const moduleName = input.module || "Business";
  const context = input.context || await buildModuleContext(moduleName, input.company);

  if (!ZAI_API_KEY) return deterministicInsight(moduleName, context);

  const prompt = `You are the embedded AI analyst for Fuze Business Suite, a SaaS portal built on ERPNext/Frappe. Give a concise module summary, risks, and practical next actions for a small South African business. Use only the supplied JSON data. Module: ${moduleName}. User question: ${input.question || "Summarise performance and improvement actions."}. Data: ${JSON.stringify(context).slice(0, 12000)}`;

  try {
    const res = await fetch(`${ZAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ZAI_API_KEY}` },
      body: JSON.stringify({
        model: ZAI_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Return strict JSON with keys: title, summary, actions, risks, confidence. actions and risks must be arrays of short strings." },
          { role: "user", content: prompt },
        ],
      }),
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error?.message || "z.ai request failed");
    const content = json?.choices?.[0]?.message?.content || "";
    const parsed = typeof content === "string" ? JSON.parse(content) : content;
    return { provider: "z.ai", ...parsed };
  } catch {
    return deterministicInsight(moduleName, context);
  }
}
