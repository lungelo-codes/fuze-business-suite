const ERPNEXT_URL = process.env.ERPNEXT_URL
const API_KEY = process.env.ERPNEXT_API_KEY
const API_SECRET = process.env.ERPNEXT_API_SECRET

export async function erpFetch(path: string, options: RequestInit = {}) {
  if (!ERPNEXT_URL) {
    throw new Error('ERPNEXT_URL is not configured')
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (API_KEY && API_SECRET) {
    headers.Authorization = `token ${API_KEY}:${API_SECRET}`
  }

  const res = await fetch(`${ERPNEXT_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers as Record<string, string> | undefined),
    },
    cache: 'no-store',
  })

  const text = await res.text()

  let json: any = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { message: text }
  }

  if (!res.ok) {
    const message =
      json?._server_messages ||
      json?.exception ||
      json?.message ||
      'Business Suite request failed'

    throw new Error(String(message))
  }

  return json
}

export function encodeFilters(filters: any[]) {
  return encodeURIComponent(JSON.stringify(filters))
}

export function encodeFields(fields: string[]) {
  return encodeURIComponent(JSON.stringify(fields))
}
