import { prisma } from '@/lib/prisma'
import { plateSearchKey } from '@/lib/plate-utils'
import { cached, TTL } from '../cache/statistics-cache'
import { clean, strip, hasWord } from '../ai/text'

export interface CatalogItem { id: string; name: string }
export interface VehicleItem { id: string; plate: string; key: string }

export interface Catalog {
  materials: CatalogItem[]
  dumps: CatalogItem[]
  vehicles: VehicleItem[]
}

/** Small reference tables used to resolve names spoken by the user. Cached 5 min. */
export async function getCatalog(): Promise<Catalog> {
  const { value } = await cached('catalog', TTL.CATALOG, async () => {
    const [materials, dumps, vehicles] = await Promise.all([
      prisma.material.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true } }),
      prisma.dumpLocation.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
      prisma.vehicle.findMany({ where: { deletedAt: null }, select: { id: true, plateNumber: true } }),
    ])
    return {
      materials,
      dumps,
      vehicles: vehicles.map(v => ({ id: v.id, plate: v.plateNumber, key: plateSearchKey(v.plateNumber) })),
    }
  })
  return value
}

/** Extra spoken synonyms → material name (diacritic-free). */
const MATERIAL_ALIASES: Record<string, string[]> = {
  'xa ban': ['xa ban', 'xac ban', 'phe thai', 'gach vun'],
  'dat': ['dat do', 'dat san lap'],
  'cat': ['cat san lap', 'cat vang', 'cat den'],
}

/**
 * Find a material mentioned in the sentence.
 * Matches with diacritics first ("đá" ≠ "đã"), then a diacritic-free fallback for
 * typed text, but only for names ≥ 3 letters to avoid "da" (đá) matching "đã".
 */
/** Material names that are also ordinary words — require "chở X" / "vật liệu X" / "loại X". */
const GENERIC_NAMES = new Set(['khac'])

export function findMaterial(text: string, materials: CatalogItem[]): CatalogItem | undefined {
  const c = clean(text)
  const s = strip(text)
  const sorted = [...materials].sort((a, b) => b.name.length - a.name.length)
  const ok = (m: CatalogItem) => {
    const sn = strip(m.name)
    return !GENERIC_NAMES.has(sn) || ['cho', 'vat lieu', 'loai'].some(p => hasWord(s, `${p} ${sn}`))
  }
  for (const m of sorted) if (hasWord(c, clean(m.name)) && ok(m)) return m
  for (const m of sorted) {
    const sn = strip(m.name)
    if (sn.length >= 3 && hasWord(s, sn) && ok(m)) return m
    if ((MATERIAL_ALIASES[sn] || []).some(a => hasWord(s, a))) return m
  }
  return undefined
}

/** Find a dump site by name ("điểm đổ Xuân Bắc", "bãi A"). */
export function findDump(text: string, dumps: CatalogItem[]): CatalogItem | undefined {
  const c = clean(text)
  const s = strip(text)
  const sorted = [...dumps].sort((a, b) => b.name.length - a.name.length)
  for (const d of sorted) {
    const cn = clean(d.name)
    if (cn.length >= 2 && hasWord(c, cn)) return d
  }
  for (const d of sorted) {
    const sn = strip(d.name)
    if (sn.length >= 3 && hasWord(s, sn)) return d
  }
  // short names like "A" only when preceded by "điểm đổ / bãi"
  const m = s.match(/(?:diem do|bai do|bai)\s+([a-z0-9]{1,3})\b/)
  if (m) return sorted.find(d => strip(d.name) === m[1])
  return undefined
}

/**
 * Extract a licence plate from speech/typed text.
 * Handles "51H12345", "51H-123.45", "51 H 123 45", "51c 236 59".
 */
export function extractPlate(text: string): string | undefined {
  const s = strip(text).toUpperCase()
  const m = s.match(/\b(\d{2})\s*-?\s*([A-Z]{1,2}\d?)\s*-?\s*((?:\d[\s.\-]?){4,5})/)
  if (!m) return undefined
  const key = `${m[1]}${m[2]}${m[3].replace(/[^0-9]/g, '')}`
  return key.length >= 7 ? key : undefined
}

export function findVehicle(plateKey: string, vehicles: VehicleItem[]): VehicleItem | undefined {
  return vehicles.find(v => v.key === plateKey)
}
