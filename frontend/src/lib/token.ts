/** Decode JWT payload without external deps using atob */
function decodePayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64)) as Record<string, unknown>
  } catch {
    return null
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodePayload(token)
  if (!payload || typeof payload.exp !== 'number') return true
  return Date.now() >= payload.exp * 1000
}

/** Returns seconds until token expires, or 0 if already expired */
export function tokenSecondsLeft(token: string): number {
  const payload = decodePayload(token)
  if (!payload || typeof payload.exp !== 'number') return 0
  return Math.max(0, Math.floor((payload.exp * 1000 - Date.now()) / 1000))
}
