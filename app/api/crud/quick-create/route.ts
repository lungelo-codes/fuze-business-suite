import { NextResponse } from 'next/server'
import { erpMethod, BusinessSuiteError } from '@/lib/server/erpnext'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as { doctype?: string; label?: string; values?: Record<string, unknown> }
    const doctype = String(body.doctype || '').trim()
    const label = String(body.label || '').trim()
    if (!doctype || !label) return NextResponse.json({ error: 'doctype and label are required' }, { status: 400 })
    const result = await erpMethod<any>('business_crud.quick_create', { doctype, label, values: body.values || {} })
    const doc = result?.data || result?.message || result || {}
    const name = String(doc.name || doc.value || label)
    return NextResponse.json({ data: { ...doc, value: name, label: doc.label || name } })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not quick-create record' }, { status: e instanceof BusinessSuiteError ? e.status : 500 })
  }
}
