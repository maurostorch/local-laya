import type { Health, LayaResponse } from './types'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json()
    if (typeof body.detail === 'string') return body.detail
    if (Array.isArray(body.detail)) return body.detail.map((item: { msg?: string }) => item.msg ?? '').join('; ')
  } catch {
    // A non-JSON body falls through to the status text.
  }
  return response.statusText || 'Request failed'
}

export async function fetchHealth(): Promise<Health> {
  const response = await fetch('/health')
  if (!response.ok) throw new ApiError(await errorMessage(response), response.status)
  return response.json()
}

export async function runDecision(request: unknown, apiKey: string): Promise<LayaResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`
  const response = await fetch('/v1/systemone', { method: 'POST', headers, body: JSON.stringify(request) })
  if (!response.ok) throw new ApiError(await errorMessage(response), response.status)
  return response.json()
}
