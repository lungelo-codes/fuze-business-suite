import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    user: {
      name: 'Business Suite User',
      email: 'user@example.com',
      role: 'Customer',
    },
  })
}
