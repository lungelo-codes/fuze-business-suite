import { NextResponse } from 'next/server'
import { erpMethod, BusinessSuiteError } from '@/lib/server/erpnext'

export async function GET(req: Request) {
  try {
    const p = new URL(req.url).searchParams
    const doctype = p.get('doctype') || ''
    const name = p.get('name') || ''
    const pdf = p.get('pdf') ?? '1'
    if (!doctype || !name) return NextResponse.json({ error: 'doctype and name are required' }, { status: 400 })
    const result = await erpMethod<any>('invoice_quote.get_business_suite_document', { data: { doctype, name, pdf } })
    return NextResponse.json({ data: result })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not render document' }, { status: e instanceof BusinessSuiteError ? e.status : 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const result = await erpMethod<any>('invoice_quote.get_business_suite_document', { data: body })
    return NextResponse.json({ data: result })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not render document' }, { status: e instanceof BusinessSuiteError ? e.status : 500 })
  }
}
