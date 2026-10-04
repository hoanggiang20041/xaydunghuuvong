/**
 * Small in-memory TTL cache for assistant statistics.
 *
 * - Keys include the user's project scope, so users never see each other's data.
 * - Trip mutations call `invalidateStats()` which bumps a version → all keys go stale.
 * - On Vercel each serverless instance has its own memory, so cross-instance
 *   freshness relies on the short TTL (max 60s).
 */

interface Entry<T> { value: T; expires: number }

const store = new Map<string, Entry<unknown>>()
let dataVersion = 0
const MAX_ENTRIES = 500

export const TTL = {
  TODAY: 20_000,   // ranges that include today change often
  PAST: 60_000,    // past ranges rarely change
  CATALOG: 300_000 // materials / dump sites / plates
}

export function invalidateStats() {
  dataVersion++
}

function fullKey(key: string) {
  return `v${dataVersion}:${key}`
}

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<{ value: T; hit: boolean }> {
  const k = fullKey(key)
  const now = Date.now()
  const e = store.get(k) as Entry<T> | undefined
  if (e && e.expires > now) return { value: e.value, hit: true }

  const value = await load()
  if (store.size >= MAX_ENTRIES) {
    for (const [key, entry] of store) if (entry.expires <= now || !key.startsWith(`v${dataVersion}:`)) store.delete(key)
    if (store.size >= MAX_ENTRIES) store.clear()
  }
  store.set(k, { value, expires: now + ttlMs })
  return { value, hit: false }
}
