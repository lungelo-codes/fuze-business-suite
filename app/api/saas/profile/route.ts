import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    company_name: 'My Company',
    email: 'info@example.co.za',
    phone: '',
    vat_number: '',
    address: '',
  })
}

export async function PUT(req: Request) {
  const body = await req.json()

  return NextResponse.json({
    ok: true,
    data: body,
  })
}
