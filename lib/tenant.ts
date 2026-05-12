import { cookies } from 'next/headers'

export function getTenantIdFromRequest(req?: Request) {
  const headerTenant = req?.headers.get('x-tenant')
  if (headerTenant) return headerTenant

  const cookieTenant = cookies().get('tenant')?.value
  if (cookieTenant) return cookieTenant

  return null
}

export function requireTenant(req?: Request) {
  const tenant = getTenantIdFromRequest(req)
  if (!tenant) {
    throw new Error('No active business account was found for this session.')
  }
  return tenant
}
