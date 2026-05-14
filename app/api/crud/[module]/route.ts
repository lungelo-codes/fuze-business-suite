import { NextResponse } from 'next/server'
import { getCrudConfig } from '@/lib/crudConfig'
import { BusinessSuiteError } from '@/lib/server/erpnext'
import { listModuleRows, createModuleRow } from '@/lib/server/moduleApi'

export async function GET(req: Request,{ params }: { params: { module: string } }) {
  try {
    const config = getCrudConfig(params.module)
    if (!config) return NextResponse.json({ error: 'Unknown module' }, { status: 404 })
    const { searchParams } = new URL(req.url)
    const query = Object.fromEntries(searchParams.entries())
    const rows = await listModuleRows(params.module, query)
    return NextResponse.json({ data: rows, meta: { fromBusinessApi: true, doctype: config.doctype } })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not load records' }, { status: e instanceof BusinessSuiteError ? e.status : 500 })
  }
}

export async function POST(req: Request,{ params }: { params: { module: string } }) {
  try {
    const config = getCrudConfig(params.module)
    if (!config) return NextResponse.json({ error: 'Unknown module' }, { status: 404 })
    const body = await req.json()
    const created = await createModuleRow(params.module, body)
    return NextResponse.json({ data: created }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not create record. Check permissions and required fields.' }, { status: e instanceof BusinessSuiteError ? e.status : 500 })
  }
}
