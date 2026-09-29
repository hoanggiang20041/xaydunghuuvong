/**
 * Normalize Vietnamese license plate number
 * Input: "51d12345" or "51D 123 45" or "51D-12345"
 * Output: "51D-12345" (or "51D-123.45" for certain formats)
 */
export function normalizePlateNumber(plate: string): string {
  // Remove all spaces and special chars except letters and numbers
  let cleaned = plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()

  // Basic Vietnamese plate format: XXY-ZZZZZ (2 digits, 1 letter, dash, 5 digits)
  // or XXY-ZZZ.ZZ
  if (cleaned.length >= 7 && cleaned.length <= 10) {
    // Extract parts
    const prefix = cleaned.slice(0, 3) // e.g. "51D"
    const suffix = cleaned.slice(3)     // e.g. "12345"
    
    if (/^\d{2}[A-Z]$/.test(prefix) && /^\d+$/.test(suffix)) {
      if (suffix.length === 5) {
        return `${prefix}-${suffix.slice(0, 3)}.${suffix.slice(3)}`
      } else if (suffix.length === 4) {
        return `${prefix}-${suffix}`
      }
      return `${prefix}-${suffix}`
    }
  }

  // If doesn't match expected format, just return uppercase cleaned version
  // with a dash after position 3 if it looks like a plate
  if (cleaned.length >= 7) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`
  }

  return cleaned
}

/**
 * Validate if a string looks like a valid plate number
 */
export function isValidPlateNumber(plate: string): boolean {
  const normalized = normalizePlateNumber(plate)
  // Basic check: at least 7 chars, starts with 2 digits + letter
  return /^\d{2}[A-Z]/.test(normalized) && normalized.length >= 7
}

/**
 * Search-friendly plate number (remove dashes and dots for searching)
 */
export function plateSearchKey(plate: string): string {
  return plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}
