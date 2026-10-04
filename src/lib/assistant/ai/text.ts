/**
 * Vietnamese text helpers for the assistant intent parser.
 */

/** Lowercase, NFC-normalized, collapsed whitespace. Keeps diacritics. */
export function clean(text: string): string {
  return text.normalize('NFC').toLowerCase().replace(/[?!.,;:"“”]/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Remove Vietnamese diacritics: "Hôm nay đất" -> "hom nay dat" */
export function strip(text: string): string {
  return clean(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
}

/** Whole-word match that works with Vietnamese letters. */
export function hasWord(haystack: string, needle: string): boolean {
  if (!needle) return false
  const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^\\p{L}\\p{N}])${esc}([^\\p{L}\\p{N}]|$)`, 'u').test(haystack)
}

/** True if any of the (diacritic-free) phrases appear as whole words in stripped text. */
export function hasAny(stripped: string, phrases: string[]): boolean {
  return phrases.some(p => hasWord(stripped, p))
}
