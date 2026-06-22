/**
 * Phone number extraction and cleaning utilities for strict Indian mobile numbers.
 */

/**
 * Extracts ALL unique, valid Indian mobile numbers from a given text.
 * Strict Rule applied: Must be 10 digits and start with 6, 7, 8, or 9.
 */
export function extractAllIndianPhones(text: string | null | undefined): string[] {
  if (!text) return [];

  // 1. Remove spaces, dashes, dots, parentheses to handle cases like "987-654 3210"
  const compactText = String(text).replace(/[\s\-\(\)\.]/g, '');

  // 2. Split by multiple delimiters (/, comma, semicolon, pipe, newline)
  // Need to escape backslash for newline properly, or just use literal newline.
  const parts = compactText.split(/[\/,;| \n]/);
  
  const validPhones = new Set<string>();

  for (const part of parts) {
    // 3. Keep only digits
    const digits = part.replace(/\D/g, '');
    if (!digits) continue;

    let core: string | null = null;

    // 4. Normalize to 10 digits by stripping country codes or STD prefixes
    if (digits.length === 10) {
      core = digits;
    } else if (digits.length === 11 && digits.startsWith('0')) {
      core = digits.slice(1);
    } else if (digits.length === 12 && digits.startsWith('91')) {
      core = digits.slice(2);
    } else if (digits.length === 13 && digits.startsWith('091')) {
      core = digits.slice(3);
    }

    // 5. Strict Mobile Validation: Must be 10 digits AND start with 6, 7, 8, or 9
    if (core && core.length === 10 && /^[6789]/.test(core)) {
      validPhones.add(core);
    }
  }

  return Array.from(validPhones);
}
