/**
 * localStorage cache helpers for offline-first lead data.
 */
import { CACHE_KEY, CACHE_VERSION } from '../constants';
import type { RawLead, Campaign, LocalCache } from '../types';

/** Save leads and campaigns to localStorage cache. */
export function saveToLocalCache(leads: RawLead[], campaigns: Campaign[]): void {
  try {
    const cache: LocalCache = {
      leads,
      campaigns,
      syncedAt: new Date().toISOString(),
      version: CACHE_VERSION,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Cache save failed (possibly quota exceeded):', e);
  }
}

/** Load leads and campaigns from localStorage cache. Returns null if no cache or version mismatch. */
export function loadFromLocalCache(): {
  leads: RawLead[];
  campaigns: Campaign[];
  syncedAt: string;
} | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache: LocalCache = JSON.parse(raw);
    if (cache.version !== CACHE_VERSION) return null;
    return {
      leads: cache.leads,
      campaigns: cache.campaigns,
      syncedAt: cache.syncedAt,
    };
  } catch {
    return null;
  }
}

/** Clear localStorage cache. */
export function clearLocalCache(): void {
  localStorage.removeItem(CACHE_KEY);
}
