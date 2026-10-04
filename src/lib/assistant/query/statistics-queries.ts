/**
 * Whitelisted, parameterized aggregate queries for the assistant.
 * The AI never writes SQL: it only picks one of these functions + validated params.
 * Every query is restricted to the caller's accessible projects (scope).
 * All math (COUNT / SUM / GROUP BY / differences) is done here, never by the AI.
 */
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { vnStart, vnEnd } from '@/lib/date-utils'
import type { DateRange, StructuredQuery } from '../types'

/** null = all projects (global roles); [] = no access */
export type Scope = string[] | null

/** Stored volume first; fall back to L×W×H computed in the database. */
const VOLUME = Prisma.sql`COALESCE(t.volume_m3, t.actual_volume, t.expected_volume, t.length_m * t.width_m * t.height_m, 0)`
const VN_HOUR = Prisma.sql`EXTRACT(HOUR FROM (t.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Ho_Chi_Minh')`

interface WhereOpts { range?: DateRange; skipRange?: boolean }

function where(q: Partial<StructuredQuery>, scope: Scope, opts: WhereOpts = {}): Prisma.Sql {
  const parts: Prisma.Sql[] = [Prisma.sql`t.deleted_at IS NULL`, Prisma.sql`t.status::text <> 'CANCELLED'`]
  const range = opts.range || q.range
  if (range && !opts.skipRange) {
    parts.push(Prisma.sql`t.created_at >= ${vnStart(range.from)} AND t.created_at <= ${vnEnd(range.to)}`)
  }
  if (scope !== null) {
    parts.push(scope.length ? Prisma.sql`t.project_id = ANY(${scope})` : Prisma.sql`FALSE`)
  }
  if (q.materialId) parts.push(Prisma.sql`t.material_id = ${q.materialId}`)
  if (q.vehicleId) parts.push(Prisma.sql`t.vehicle_id = ${q.vehicleId}`)
  if (q.destId) parts.push(Prisma.sql`t.dump_location_id = ${q.destId}`)
  if (q.hourFrom !== undefined) parts.push(Prisma.sql`${VN_HOUR} >= ${q.hourFrom}`)
  if (q.hourTo !== undefined) parts.push(Prisma.sql`${VN_HOUR} < ${q.hourTo}`)
  return Prisma.join(parts, ' AND ')
}

export interface Summary { trips: number; volume: number; vehicles: number }

/** get_trip_count + get_total_volume: one round trip, COUNT + SUM + COUNT DISTINCT. */
export async function getSummary(q: Partial<StructuredQuery>, scope: Scope, range?: DateRange): Promise<Summary> {
  const rows = await prisma.$queryRaw<{ trips: number; volume: number; vehicles: number }[]>`
    SELECT COUNT(*)::int AS trips,
           COALESCE(SUM(${VOLUME}), 0)::float8 AS volume,
           COUNT(DISTINCT t.vehicle_id)::int AS vehicles
    FROM trips t
    WHERE ${where(q, scope, { range })}`
  const r = rows[0] || { trips: 0, volume: 0, vehicles: 0 }
  return { trips: Number(r.trips), volume: round(r.volume), vehicles: Number(r.vehicles) }
}

export interface GroupRow { name: string; trips: number; volume: number }

/** get_vehicle_summary / get_vehicle_trips: GROUP BY plate. */
export async function getVehicleSummary(q: Partial<StructuredQuery>, scope: Scope, limit = 10): Promise<GroupRow[]> {
  const rows = await prisma.$queryRaw<GroupRow[]>`
    SELECT v.plate_number AS name, COUNT(*)::int AS trips, COALESCE(SUM(${VOLUME}), 0)::float8 AS volume
    FROM trips t JOIN vehicles v ON v.id = t.vehicle_id
    WHERE ${where(q, scope)}
    GROUP BY v.plate_number
    ORDER BY trips DESC, volume DESC
    LIMIT ${limit}`
  return rows.map(norm)
}

/** get_destination_summary: GROUP BY dump site. */
export async function getDestinationSummary(q: Partial<StructuredQuery>, scope: Scope, limit = 5): Promise<GroupRow[]> {
  const rows = await prisma.$queryRaw<GroupRow[]>`
    SELECT COALESCE(d.name, 'Chưa ghi điểm đổ') AS name, COUNT(*)::int AS trips, COALESCE(SUM(${VOLUME}), 0)::float8 AS volume
    FROM trips t LEFT JOIN dump_locations d ON d.id = t.dump_location_id
    WHERE ${where(q, scope)}
    GROUP BY COALESCE(d.name, 'Chưa ghi điểm đổ')
    ORDER BY trips DESC, volume DESC
    LIMIT ${limit}`
  return rows.map(norm)
}

/** GROUP BY material. */
export async function getMaterialSummary(q: Partial<StructuredQuery>, scope: Scope, limit = 6): Promise<GroupRow[]> {
  const rows = await prisma.$queryRaw<GroupRow[]>`
    SELECT m.name AS name, COUNT(*)::int AS trips, COALESCE(SUM(${VOLUME}), 0)::float8 AS volume
    FROM trips t JOIN materials m ON m.id = t.material_id
    WHERE ${where(q, scope)}
    GROUP BY m.name
    ORDER BY trips DESC
    LIMIT ${limit}`
  return rows.map(norm)
}

/** GROUP BY hour (VN time). */
export async function getHourlySummary(q: Partial<StructuredQuery>, scope: Scope): Promise<{ hour: number; trips: number }[]> {
  const rows = await prisma.$queryRaw<{ hour: number; trips: number }[]>`
    SELECT ${VN_HOUR}::int AS hour, COUNT(*)::int AS trips
    FROM trips t
    WHERE ${where(q, scope)}
    GROUP BY 1
    ORDER BY trips DESC, hour ASC
    LIMIT 3`
  return rows.map(r => ({ hour: Number(r.hour), trips: Number(r.trips) }))
}

/** Vehicles currently inside (checked in, not out) — independent of date. */
export async function getOnsite(q: Partial<StructuredQuery>, scope: Scope): Promise<{ count: number; plates: string[] }> {
  const base = where({ ...q, hourFrom: undefined, hourTo: undefined }, scope, { skipRange: true })
  const rows = await prisma.$queryRaw<{ plate: string }[]>`
    SELECT v.plate_number AS plate
    FROM trips t JOIN vehicles v ON v.id = t.vehicle_id
    WHERE ${base} AND t.status::text IN ('CHECKED_IN', 'IN_PROGRESS')
    ORDER BY t.created_at ASC
    LIMIT 50`
  return { count: rows.length, plates: rows.map(r => r.plate) }
}

export interface Comparison {
  current: Summary
  previous: Summary
  diffTrips: number
  diffVolume: number
}

/** get_daily_summary for comparisons: differences computed here, not by the AI. */
export async function getComparison(q: Partial<StructuredQuery>, scope: Scope, current: DateRange, previous: DateRange): Promise<Comparison> {
  const [a, b] = await Promise.all([getSummary(q, scope, current), getSummary(q, scope, previous)])
  return { current: a, previous: b, diffTrips: a.trips - b.trips, diffVolume: round(a.volume - b.volume) }
}

function round(n: unknown) {
  return Math.round((Number(n) || 0) * 10) / 10
}

function norm(r: GroupRow): GroupRow {
  return { name: r.name, trips: Number(r.trips), volume: round(r.volume) }
}
