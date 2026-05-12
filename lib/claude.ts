// lib/claude.ts – Anthropic Claude API integration for Fuze Business Suite
// Used for AI Assistant, auto-insights, and smart form fills

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClaudeResponse {
  content: string;
  error?: string;
}

// System prompt that gives Claude context about the business suite
const SYSTEM_PROMPT = `You are Fuze AI, an intelligent business assistant embedded in Fuze Business Suite — a South African SaaS platform built on ERPNext/Frappe.

You help business users with:
- Understanding their CRM pipeline and sales data
- Explaining accounting figures and compliance obligations (VAT, PAYE, UIF, SDL, CIPC)
- Drafting professional emails, quotes, and proposals for South African businesses
- Analysing business health and recommending actions
- Guiding users through workflows (lead → opportunity → quote → invoice)
- South African business context (ZAR currency, SARS deadlines, Companies Act requirements)

Keep responses practical, concise, and business-focused. Use South African English spelling. 
Format key figures clearly. When discussing money, use ZAR format (R 1,234.56).
Be friendly but professional — like a trusted CFO or business advisor.`;

export async function askClaude(
  messages: ChatMessage[],
  systemOverride?: string
): Promise<ClaudeResponse> {
  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-calls": "true",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: systemOverride ?? SYSTEM_PROMPT,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text ?? "";
    return { content: text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Claude unavailable";
    return { content: "", error: msg };
  }
}

// Convenience: single-turn question with business context injected
export async function businessQuestion(
  question: string,
  context?: Record<string, unknown>
): Promise<string> {
  const contextStr = context
    ? `\n\nCurrent business context:\n${JSON.stringify(context, null, 2)}`
    : "";

  const { content, error } = await askClaude([
    { role: "user", content: question + contextStr },
  ]);

  return error ? `⚠️ ${error}` : content;
}

// Generate email / quote body from lead/deal data
export async function generateEmail(
  type: "follow_up" | "proposal" | "quote" | "invoice_reminder",
  data: Record<string, unknown>
): Promise<string> {
  const prompts: Record<string, string> = {
    follow_up: `Write a professional follow-up email for a South African sales lead. Keep it under 150 words.`,
    proposal: `Write a professional business proposal introduction email for South African context.`,
    quote: `Write a brief email to accompany a business quote. Professional, under 100 words.`,
    invoice_reminder: `Write a polite payment reminder email for an overdue invoice. South African context.`,
  };

  const { content } = await askClaude([
    {
      role: "user",
      content: `${prompts[type]}\n\nData:\n${JSON.stringify(data, null, 2)}`,
    },
  ]);

  return content;
}

// Analyse pipeline and give recommendations
export async function analysePipeline(
  deals: unknown[],
  currency = "ZAR"
): Promise<string> {
  const { content, error } = await askClaude([
    {
      role: "user",
      content: `Analyse this sales pipeline and give 3 concise, actionable recommendations. Currency: ${currency}.\n\nPipeline data:\n${JSON.stringify(deals, null, 2)}`,
    },
  ]);

  return error ? "Unable to analyse pipeline at this time." : content;
}
