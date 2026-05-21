import { NextResponse } from 'next/server'
import { erpMethod, BusinessSuiteError } from '@/lib/server/erpnext'

export async function GET(req: Request) {
  try {
    const p = new URL(req.url).searchParams
    const doctype = p.get('doctype') || undefined
    const result = await erpMethod<any>('invoice_quote.list_document_email_templates', { doctype, limit: 100 })
    const templates = Array.isArray(result?.templates) ? result.templates : Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : []
    return NextResponse.json({ data: templates })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not load templates', data: [] }, { status: e instanceof BusinessSuiteError ? e.status : 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const result = await erpMethod<any>('invoice_quote.save_document_email_template', { data: body })
    return NextResponse.json({ data: result })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not save template' }, { status: e instanceof BusinessSuiteError ? e.status : 500 })
  }
}
