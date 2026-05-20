import { NextResponse } from "next/server";
import { getServerSession, isAdminRole } from "@/lib/server/auth";
import { BusinessSuiteError } from "@/lib/server/erpnext";

export type SessionContext = {
  sid: string;
  role: string;
  company: string;
  fullName: string;
  email: string;
  tenantUrl: string;
  isLoggedIn: boolean;
  isAdmin: boolean;
};

const BACKEND_LEAK_PATTERNS = [
  /erpnext/i,
  /frappe/i,
  /doctype/i,
  /traceback/i,
  /permissionerror/i,
  /validationerror/i,
  /does not have.*permission/i,
  /not permitted/i,
  /module .* has no attribute/i,
  /failed to get method/i,
  /no module named/i,
  /app .* is not installed/i,
  /raw .* resource access/i,
];

export function getSessionContext(): SessionContext {
  const session = getServerSession();
  return {
    ...session,
    isAdmin: isAdminRole(session.role),
  };
}

export function requireSaaSUser(): SessionContext {
  const session = getSessionContext();
  if (!session.isLoggedIn) throw new BusinessSuiteError("Please sign in to continue.", 401);
  if (!session.company && !session.isAdmin) throw new BusinessSuiteError("Your company workspace is not ready yet. Please contact support.", 403);
  return session;
}

export function requireAdminUser(): SessionContext {
  const session = getSessionContext();
  if (!session.isLoggedIn) throw new BusinessSuiteError("Please sign in to continue.", 401);
  if (!session.isAdmin) throw new BusinessSuiteError("You do not have access to this admin action.", 403);
  return session;
}

export function tenantArgs<T extends Record<string, unknown>>(args?: T, session = requireSaaSUser()): T & { company?: string; _tenant_company?: string; _tenant_user?: string } {
  const next: Record<string, unknown> = { ...(args || {}) };
  if (session.company) {
    if (!next.company) next.company = session.company;
    next._tenant_company = session.company;
  }
  if (session.email) next._tenant_user = session.email;
  return next as T & { company?: string; _tenant_company?: string; _tenant_user?: string };
}

export function tenantData<T extends Record<string, unknown>>(data?: T, session = requireSaaSUser()): T & { company?: string; owner_email?: string } {
  const next: Record<string, unknown> = { ...(data || {}) };
  if (session.company && !next.company) next.company = session.company;
  if (session.email && !next.owner_email) next.owner_email = session.email;
  return next as T & { company?: string; owner_email?: string };
}

export function cleanErrorMessage(error: unknown, fallback = "Something went wrong. Please try again or contact support.") {
  const message = error instanceof Error ? error.message : String(error || "");
  if (!message) return fallback;
  if (BACKEND_LEAK_PATTERNS.some((pattern) => pattern.test(message))) return fallback;
  return message.replace(/<[^>]+>/g, "").slice(0, 180);
}

export function errorStatus(error: unknown, fallback = 500) {
  if (error instanceof BusinessSuiteError && Number(error.status)) return error.status;
  return fallback;
}

export function safeJsonError(error: unknown, fallback: string, status?: number) {
  return NextResponse.json({ ok: false, error: cleanErrorMessage(error, fallback) }, { status: status || errorStatus(error) });
}

export function okJson<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export const WORKFLOW_ACTIONS = new Set(["submit", "cancel", "approve", "reject", "reopen"]);

export function assertWorkflowAction(action: string) {
  if (!WORKFLOW_ACTIONS.has(action)) throw new BusinessSuiteError("Unsupported workflow action.", 400);
}
