import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ALL_MODULES, MODULE_COOKIE, PLAN_COOKIE, calculateSubscriptionTotal, getModulesForPlan } from '@/lib/appModules'

function parseModules(raw?: string): string[] { try { return raw ? JSON.parse(decodeURIComponent(raw)) : [] } catch { return [] } }
export async function GET() {
  const store = cookies()
  const plan = store.get(PLAN_COOKIE)?.value || 'Starter'
  const activeModules = parseModules(store.get(MODULE_COOKIE)?.value)
  const modules = activeModules.length ? activeModules : getModulesForPlan(plan)
  return NextResponse.json({ modules: ALL_MODULES, activeModules: modules, plan, total: calculateSubscriptionTotal(plan, modules) })
}
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { plan?: string; modules?: string[] }
  const plan = body.plan || 'Starter'
  const modules = Array.isArray(body.modules) && body.modules.length ? body.modules : getModulesForPlan(plan)
  const res = NextResponse.json({ ok: true, modules: ALL_MODULES, activeModules: modules, plan, total: calculateSubscriptionTotal(plan, modules), decision: { effective: 'immediate', message: 'Plan and module selection updated.' } })
  res.cookies.set(PLAN_COOKIE, plan, { path: '/', sameSite: 'lax' })
  res.cookies.set(MODULE_COOKIE, encodeURIComponent(JSON.stringify(modules)), { path: '/', sameSite: 'lax' })
  return res
}
