import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { erpGet } from '@/lib/server/erpnext'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    const role = cookieStore.get('fuze_role')?.value || 'customer'
    const fullName = cookieStore.get('fuze_full_name')?.value
      ? decodeURIComponent(cookieStore.get('fuze_full_name')!.value)
      : ''
    const email = cookieStore.get('fuze_email')?.value
      ? decodeURIComponent(cookieStore.get('fuze_email')!.value)
      : ''
    const company = cookieStore.get('fuze_company')?.value
      ? decodeURIComponent(cookieStore.get('fuze_company')!.value)
      : ''
    const plan = cookieStore.get('fuze_plan')?.value || 'Starter'
    const tenant = cookieStore.get('fuze_tenant')?.value || ''

    // Try to get live user data from ERPNext
    let liveUser: Record<string, unknown> = {}
    if (userId) {
      try {
        const res = await erpGet<{ data?: Record<string, unknown>; message?: Record<string, unknown> }>(
          `/api/resource/User/${encodeURIComponent(userId)}`
        )
        liveUser = res.data ?? res.message ?? {}
      } catch {}
    }

    return NextResponse.json({
      user: {
        name: String(liveUser.full_name || fullName || userId || 'Business Suite User'),
        email: String(liveUser.email || email || userId || 'user@example.com'),
        role,
        company,
        plan,
        tenant,
        mobile_no: String(liveUser.mobile_no || ''),
        phone: String(liveUser.phone || ''),
        userId: userId || '',
        isAdmin: role === 'admin' || role === 'Administrator' || role === 'System Manager',
      },
    })
  } catch {
    return NextResponse.json({
      user: {
        name: 'Business Suite User',
        email: 'user@example.com',
        role: 'customer',
        company: '',
        plan: 'Starter',
        tenant: '',
        isAdmin: false,
      },
    })
  }
}
