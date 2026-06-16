/**
 * Lead deduplication logic.
 * Checks if leads already exist in the database by Page ID.
 */
import type { RawLead } from '../types';

/** Deduplicate leads against an existing set (by Page ID). */
export function deduplicateLeads(
  newLeads: RawLead[],
  existingLeads: RawLead[]
): { unique: RawLead[]; duplicates: number } {
  const existingIds = new Set(existingLeads.map(l => l.id));

  const unique: RawLead[] = [];
  let duplicates = 0;

  for (const lead of newLeads) {
    if (existingIds.has(lead.id)) {
      duplicates++;
    } else {
      unique.push(lead);
      existingIds.add(lead.id); // Prevent duplicates within newLeads too
    }
  }

  return { unique, duplicates };
}
