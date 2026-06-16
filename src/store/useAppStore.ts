/**
 * Zustand global store for LeadSync Pro.
 * Manages leads, campaigns, sync state, and global stats.
 */
import { create } from 'zustand';
import type { RawLead, Campaign } from '../types';
import { fetchAllLeads } from '../lib/firestore';
import { saveToLocalCache, loadFromLocalCache, clearLocalCache } from '../lib/localCache';

interface AppState {
  // Data
  leads: RawLead[];
  campaigns: Campaign[];
  totalLeads: number;

  // Sync state
  isLoading: boolean;
  isSyncing: boolean;
  syncedAt: string | null;
  isFromCache: boolean;
  error: string | null;

  // Actions
  setLeads: (leads: RawLead[]) => void;
  setCampaigns: (campaigns: Campaign[]) => void;
  syncFromFirestore: () => Promise<void>;
  loadCache: () => boolean;
  updateLeadWhatsapp: (leadId: string, phone: string) => void;
  addCampaignLocally: (campaign: Campaign, leads: RawLead[]) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  leads: [],
  campaigns: [],
  totalLeads: 0,
  isLoading: false,
  isSyncing: false,
  syncedAt: null,
  isFromCache: false,
  error: null,

  setLeads: (leads) => set({ leads, totalLeads: leads.length }),

  setCampaigns: (campaigns) => set({ campaigns }),

  loadCache: () => {
    const cache = loadFromLocalCache();
    if (cache) {
      set({
        leads: cache.leads,
        campaigns: cache.campaigns,
        totalLeads: cache.leads.length,
        syncedAt: cache.syncedAt,
        isFromCache: true,
      });
      return true;
    }
    return false;
  },

  syncFromFirestore: async () => {
    set({ isSyncing: true, error: null });
    try {
      clearLocalCache();
      const { leads, campaigns } = await fetchAllLeads();
      saveToLocalCache(leads, campaigns);
      set({
        leads,
        campaigns,
        totalLeads: leads.length,
        syncedAt: new Date().toISOString(),
        isFromCache: false,
        isSyncing: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to sync',
        isSyncing: false,
      });
      throw error;
    }
  },

  updateLeadWhatsapp: (leadId, phone) => {
    const { leads, campaigns } = get();
    const updated = leads.map(l =>
      l.id === leadId && l.phone === phone
        ? { ...l, whatsappSent: true }
        : l
    );
    set({ leads: updated });
    saveToLocalCache(updated, campaigns);
  },

  addCampaignLocally: (campaign, newLeads) => {
    const { leads, campaigns } = get();
    const updatedLeads = [...newLeads.map(l => ({
      ...l,
      _campaignName: campaign.name,
      _campaignId: campaign.id,
    })), ...leads];
    const updatedCampaigns = [campaign, ...campaigns];
    set({
      leads: updatedLeads,
      campaigns: updatedCampaigns,
      totalLeads: updatedLeads.length,
    });
    saveToLocalCache(updatedLeads, updatedCampaigns);
  },
}));
