import { NextResponse } from 'next/server'
import { getCrudConfig } from '@/lib/crudConfig'
import { BusinessSuiteError } from '@/lib/server/erpnext'
import { actionModuleRow, deleteModuleRow, getModuleRow, updateModuleRow } from '@/lib/server/moduleApi'

export async function GET(_req: Request,{ params }: { params: { module: string; id: string } }) {
  try {
    if (!getCrudConfig(params.module)) return NextResponse.json({ error: 'Unknown module' }, { status: 404 })
    const data = await getModuleRow(params.module, params.id)
    return NextResponse.json({ data })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not load record' }, { status: e instanceof BusinessSuiteError ? e.status : 500 })
  }
}

export async function PUT(req: Request,{ params }: { params: { module: string; id: string } }) {
  try {
    if (!getCrudConfig(params.module)) return NextResponse.json({ error: 'Unknown module' }, { status: 404 })
    const body = await req.json()
    const updated = await updateModuleRow(params.module, params.id, body)
    return NextResponse.json({ data: updated })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not update record' }, { status: e instanceof BusinessSuiteError ? e.status : 500 })
  }
}

export async function PATCH(req: Request,{ params }: { params: { module: string; id: string } }) {
  try {
    if (!getCrudConfig(params.module)) return NextResponse.json({ error: 'Unknown module' }, { status: 404 })
    const body = await req.json()
    if (body.action === 'submit' || body.action === 'cancel') {
      const result = await actionModuleRow(params.module, params.id, body.action)
      return NextResponse.json({ data: result })
    }
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not perform action' }, { status: e instanceof BusinessSuiteError ? e.status : 500 })
  }
}

export async function DELETE(_req: Request,{ params }: { params: { module: string; id: string } }) {
  try {
    if (!getCrudConfig(params.module)) return NextResponse.json({ error: 'Unknown module' }, { status: 404 })
    await deleteModuleRow(params.module, params.id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not delete record' }, { status: e instanceof BusinessSuiteError ? e.status : 500 })
  }
}
