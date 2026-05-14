import { NextResponse } from 'next/server'
import { erpMethod, BusinessSuiteError } from '@/lib/server/erpnext'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const doctype = searchParams.get('doctype') || ''
    const query = searchParams.get('query') || searchParams.get('q') || ''
    if (!doctype) return NextResponse.json({ error: 'Missing doctype' }, { status: 400 })
    const result = await erpMethod<unknown>('business_crud.get_options', { doctype, query, limit: 100 })
    const rows = Array.isArray(result) ? result : Array.isArray((result as any)?.data) ? (result as any).data : Array.isArray((result as any)?.options) ? (result as any).options : []
    const data = rows.map((row: any) => {
      if (typeof row === 'string') return { value: row, label: row }
      const value = String(row.value || row.name || row.id || '')
      const label = String(row.label || row.title || row.customer_name || row.supplier_name || row.item_name || value)
      return { value, label }
    }).filter((row: any) => row.value)
    return NextResponse.json({ data })
  } catch (e) {
    return NextResponse.json({ data: [], error: e instanceof Error ? e.message : 'Could not load options' }, { status: e instanceof BusinessSuiteError ? e.status : 500 })
  }
}
