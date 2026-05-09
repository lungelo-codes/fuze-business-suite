import { NextResponse } from 'next/server'
import { erpMethod, BusinessSuiteError } from '@/lib/server/erpnext'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const doctype = searchParams.get('doctype') || ''
    const query = searchParams.get('q') || searchParams.get('query') || ''
    if (!doctype) return NextResponse.json({ error: 'Missing doctype' }, { status: 400 })
    const data = await erpMethod<Array<{ value: string; label: string }>>('fuze_suite.api.business_crud.get_options', { doctype, query, limit: 100 })
    return NextResponse.json({ data: data || [] })
  } catch (e) {
    return NextResponse.json({ data: [], error: e instanceof Error ? e.message : 'Could not load options' }, { status: e instanceof BusinessSuiteError ? e.status : 500 })
  }
}
