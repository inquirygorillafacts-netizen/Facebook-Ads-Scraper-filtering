import type { RawLead } from '../types';

export interface DeduplicationResult {
  leadsToInsert: RawLead[];
  leadsToUpdate: RawLead[];
  stats: {
    saved: number;
    skipped: number;
    updated: number;
  };
}

export function deduplicateAndMergeLeads(
  newLeads: RawLead[],
  existingLeads: RawLead[]
): DeduplicationResult {
  const phoneMap = new Map<string, RawLead>();
  const emailMap = new Map<string, RawLead>();

  // Build lookup maps from existing leads
  for (const lead of existingLeads) {
    if (lead.phone) phoneMap.set(lead.phone, lead);
    if (lead.email) emailMap.set(lead.email.toLowerCase(), lead);
  }

  const leadsToInsert: RawLead[] = [];
  const leadsToUpdateMap = new Map<string, RawLead>(); // map by campaign+chunk+index
  let skipped = 0;
  let updated = 0;

  for (const newLead of newLeads) {
    // 1. Asset-Based Stripping (Independent Checks)
    let mergeTarget: RawLead | undefined;

    if (newLead.phone && phoneMap.has(newLead.phone)) {
      mergeTarget = phoneMap.get(newLead.phone);
      newLead.phone = null; // Strip duplicate phone
      newLead.phoneSource = null;
    }
    
    if (newLead.email && emailMap.has(newLead.email.toLowerCase())) {
      if (!mergeTarget) mergeTarget = emailMap.get(newLead.email.toLowerCase());
      newLead.email = null; // Strip duplicate email
    }

    if (!newLead.phone && !newLead.email) {
      // 2. Both stripped -> Entirely Duplicate -> Skip insertion
      skipped++;

      // 3. Smart Merging into the matched target
      if (mergeTarget) {
        let isModified = false;

        const enrichableFields: (keyof RawLead)[] = [
          'name',
          'phone',
          'phoneSource',
          'email',
          'facebook',
          'instagram',
          'website',
          'adsLink',
          'landingPage',
        ];

        for (const field of enrichableFields) {
          if (!mergeTarget[field] && newLead[field]) {
            (mergeTarget as any)[field] = newLead[field];
            isModified = true;
          }
        }

        if (isModified && mergeTarget._campaignId && mergeTarget._chunkId !== undefined && mergeTarget._chunkIndex !== undefined) {
          const updateKey = `${mergeTarget._campaignId}_${mergeTarget._chunkId}_${mergeTarget._chunkIndex}`;
          if (!leadsToUpdateMap.has(updateKey)) updated++;
          leadsToUpdateMap.set(updateKey, mergeTarget);
        }
      }
    } else {
      // 4. At least one unique asset survived -> Insert as fresh lead
      // Wait, what if one field was stripped? We still want to merge the stripped field into the old lead!
      if (mergeTarget) {
         let isModified = false;
         const enrichableFields: (keyof RawLead)[] = ['name', 'facebook', 'instagram', 'website', 'adsLink', 'landingPage'];
         
         for (const field of enrichableFields) {
           if (!mergeTarget[field] && newLead[field]) {
             (mergeTarget as any)[field] = newLead[field];
             isModified = true;
           }
         }
         
         if (isModified && mergeTarget._campaignId && mergeTarget._chunkId !== undefined && mergeTarget._chunkIndex !== undefined) {
           const updateKey = `${mergeTarget._campaignId}_${mergeTarget._chunkId}_${mergeTarget._chunkIndex}`;
           if (!leadsToUpdateMap.has(updateKey)) updated++;
           leadsToUpdateMap.set(updateKey, mergeTarget);
         }
      }

      leadsToInsert.push(newLead);
      
      // Add to maps so subsequent newLeads don't duplicate each other
      if (newLead.phone) phoneMap.set(newLead.phone, newLead);
      if (newLead.email) emailMap.set(newLead.email.toLowerCase(), newLead);
    }
  }

  return {
    leadsToInsert,
    leadsToUpdate: Array.from(leadsToUpdateMap.values()),
    stats: {
      saved: leadsToInsert.length,
      skipped,
      updated,
    },
  };
}
