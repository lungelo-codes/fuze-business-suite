import { NextResponse } from 'next/server'
import { getCrudConfig } from '@/lib/crudConfig'
import { getModuleMeta } from '@/lib/server/doctypeMeta'
import { BusinessSuiteError } from '@/lib/server/erpnext'
export async function GET(_req: Request,{ params }: { params: { module: string } }) { try { const config = getCrudConfig(params.module); if (!config) return NextResponse.json({ error: 'Unknown module' }, { status: 404 }); return NextResponse.json({ data: await getModuleMeta(config) }) } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not load module metadata' }, { status: e instanceof BusinessSuiteError ? e.status : 500 }) } }
