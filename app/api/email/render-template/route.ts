import { NextResponse } from 'next/server'
import { erpMethod, BusinessSuiteError } from '@/lib/server/erpnext'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const result = await erpMethod<any>('invoice_quote.render_document_email_template', { data: body })
    return NextResponse.json({ data: result })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not render template' }, { status: e instanceof BusinessSuiteError ? e.status : 500 })
  }
}
