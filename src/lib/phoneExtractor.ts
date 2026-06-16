/**
 * Phone number extraction and cleaning utilities for Indian phone numbers.
 * Handles Meta Ads Library phone column formats and Body Text fallback.
 */

export interface PhoneResult {
  phone: string | null;
  source: 'direct' | 'bodyText' | null;
}

/**
 * Check if a raw phone string is a toll-free number (1800-xxx).
 */
function isTollFree(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('1800')) return true;
  if (digits.startsWith('911800')) return true;
  return false;
}

/**
 * Extract toll-free number from raw string.
 * Returns the full toll-free number as-is (not 10-digit cleaned).
 */
function extractTollFree(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('911800')) return digits.slice(2);
  if (digits.startsWith('1800')) return digits;
  return null;
}

/**
 * Clean a phone string to a valid 10-digit Indian number.
 * Returns the first valid number found.
 */
export function cleanPhone(rawPhone: string | null | undefined): string | null {
  if (!rawPhone) return null;

  const candidates = String(rawPhone).split(/[,;]/);

  for (const candidate of candidates) {
    const trimmed = candidate.trim();

    // Check for toll-free first
    if (isTollFree(trimmed)) {
      return extractTollFree(trimmed);
    }

    let digits = trimmed.replace(/\D/g, '');

    // Remove leading country code 91
    if (digits.startsWith('91') && digits.length === 12) {
      digits = digits.slice(2);
    } else if (digits.startsWith('0') && digits.length === 11) {
      digits = digits.slice(1);
    }

    // Must be exactly 10 digits
    if (digits.length === 10) {
      return digits;
    }
  }

  return null;
}

/**
 * Extract phone number from ad Body Text using regex.
 * Finds any 10 digit number.
 */
export function extractPhoneFromBodyText(bodyText: string | null | undefined): string | null {
  if (!bodyText) return null;

  // We look for any 10 digit number sequence
  const pattern = /(?<!\d)\d{10}(?!\d)/g;
  const matches = String(bodyText).match(pattern);

  if (matches && matches.length > 0) {
    return matches[0];
  }

  return null;
}

/**
 * Main function: get best phone for a lead.
 * Tries Phone column first, then Body Text fallback.
 */
export function getBestPhone(
  phoneColumn: string | null,
  bodyText: string | null
): PhoneResult {
  const directPhone = cleanPhone(phoneColumn);
  if (directPhone) {
    return { phone: directPhone, source: 'direct' };
  }

  const fromBody = extractPhoneFromBodyText(bodyText);
  if (fromBody) {
    return { phone: fromBody, source: 'bodyText' };
  }

  return { phone: null, source: null };
}
