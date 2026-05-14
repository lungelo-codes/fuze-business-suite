import { NextResponse } from 'next/server'
import { actionModuleRow } from '@/lib/server/moduleApi'
import { BusinessSuiteError } from '@/lib/server/erpnext'

export async function POST(_req: Request,{ params }: { params: { module: string; id: string; action: string } }) {
  try {
    const action = params.action === 'submit' ? 'submit' : params.action === 'cancel' ? 'cancel' : null
    if (!action) return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
    const result = await actionModuleRow(params.module, params.id, action)
    return NextResponse.json({ data: result })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not perform action' }, { status: e instanceof BusinessSuiteError ? e.status : 500 })
  }
}
