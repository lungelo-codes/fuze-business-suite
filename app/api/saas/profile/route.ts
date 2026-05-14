import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { erpGet, erpList, erpPatch } from '@/lib/server/erpnext'

type Row = Record<string, unknown>

async function resolveCompany(): Promise<string> {
  const cookieStore = await cookies()
  const raw = cookieStore.get('fuze_company')?.value
  if (raw) return decodeURIComponent(raw)
  try {
    const rows = await erpList<Row>('Company', { fields: ['name'], limit: 1, orderBy: 'modified desc' })
    return String(rows[0]?.name || '')
  } catch {
    return ''
  }
}

export async function GET() {
  try {
    const companyName = await resolveCompany()
    if (!companyName) {
      return NextResponse.json({
        company_name: 'My Company',
        email: '',
        phone: '',
        vat_number: '',
        address: '',
      })
    }

    const res = await erpGet<{ data?: Row; message?: Row }>(
      `/api/resource/Company/${encodeURIComponent(companyName)}`
    )
    const company = res.data ?? res.message ?? {}

    // Also try to get the Fuze Business Profile
    let profile: Row = {}
    try {
      const profiles = await erpList<Row>('Fuze Business Profile', {
        fields: ['company', 'trading_name', 'registration_number', 'vat_registered', 'phone', 'email', 'city', 'bank_name', 'account_number'],
        filters: [['company', '=', companyName]],
        limit: 1,
      })
      profile = profiles[0] || {}
    } catch {}

    return NextResponse.json({
      company_name: String(company.company_name || companyName),
      email: String(profile.email || company.email || ''),
      phone: String(profile.phone || company.phone_no || ''),
      vat_number: String(company.tax_id || ''),
      address: String(company.registration_details || ''),
      website: String(company.website || ''),
      registration_number: String(profile.registration_number || ''),
      trading_name: String(profile.trading_name || ''),
      city: String(profile.city || ''),
      bank_name: String(profile.bank_name || ''),
      account_number: String(profile.account_number || ''),
      company_logo: String(company.company_logo || ''),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load profile' },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as Row
    const companyName = await resolveCompany()
    if (!companyName) return NextResponse.json({ error: 'No company found' }, { status: 404 })

    const companyPayload: Row = {}
    if (body.email !== undefined) companyPayload.email = body.email
    if (body.phone !== undefined) companyPayload.phone_no = body.phone
    if (body.vat_number !== undefined) companyPayload.tax_id = body.vat_number
    if (body.website !== undefined) companyPayload.website = body.website
    if (body.address !== undefined) companyPayload.registration_details = body.address

    let updated: Row = {}
    if (Object.keys(companyPayload).length) {
      updated = await erpPatch<Row>('Company', companyName, companyPayload)
    }

    return NextResponse.json({ ok: true, data: { ...body, ...updated } })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not update profile' },
      { status: 500 }
    )
  }
}
