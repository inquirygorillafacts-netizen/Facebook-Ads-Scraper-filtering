/**
 * Export helpers for MSG91 CSV and full-detail exports.
 */
import * as XLSX from 'xlsx';
import { MSG91_HEADERS, FULL_EXPORT_HEADERS } from '../constants';
import type { RawLead, ExportType } from '../types';

/** Generate CSV string from leads. */
export function generateCSV(leads: RawLead[], exportType: ExportType): string {
  if (exportType === 'msg91') {
    return generateMSG91CSV(leads);
  }
  return generateFullCSV(leads);
}

/** MSG91 format: Mobile,Name — only leads with phone. */
function generateMSG91CSV(leads: RawLead[]): string {
  const phoneLeads = leads.filter(l => l.phone);
  const rows = phoneLeads.map(l => {
    const name = escapeCsvField(l.name || '');
    const phone = l.phone || '';
    return `${phone},${name}`;
  });
  return [MSG91_HEADERS.join(','), ...rows].join('\n');
}

/** Full export: all fields for leads with phone OR email. */
function generateFullCSV(leads: RawLead[]): string {
  const rows = leads.map(l => {
    return [
      escapeCsvField(l.name || ''),
      l.phone || '',
      escapeCsvField(l.email || ''),
      escapeCsvField(l.facebook || ''),
      escapeCsvField(l.instagram || ''),
      escapeCsvField(l.website || ''),
      escapeCsvField(l.adsLink || ''),
      escapeCsvField(l.landingPage || ''),
    ].join(',');
  });
  return [FULL_EXPORT_HEADERS.join(','), ...rows].join('\n');
}

/** Escape CSV field — wrap in quotes if contains comma, quote, or newline. */
function escapeCsvField(value: string): string {
  if (!value) return '';
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Generate Excel (.xlsx) file buffer. */
export function generateExcel(leads: RawLead[], exportType: ExportType): Uint8Array {
  const wb = XLSX.utils.book_new();

  if (exportType === 'msg91') {
    const phoneLeads = leads.filter(l => l.phone);
    const data = phoneLeads.map(l => ({
      Mobile: l.phone || '',
      Name: l.name || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data, { header: MSG91_HEADERS });
    XLSX.utils.book_append_sheet(wb, ws, 'MSG91 Leads');
  } else {
    const data = leads.map(l => ({
      Name: l.name || '',
      Mobile: l.phone || '',
      Email: l.email || '',
      Facebook: l.facebook || '',
      Instagram: l.instagram || '',
      Website: l.website || '',
      'Ads Link': l.adsLink || '',
      'Landing Page': l.landingPage || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data, { header: FULL_EXPORT_HEADERS });
    XLSX.utils.book_append_sheet(wb, ws, 'All Leads');
  }

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
}

/** Trigger browser download for a file. */
export function downloadFile(
  content: string | Uint8Array,
  filename: string,
  mimeType: string
): void {
  const blob = content instanceof Uint8Array
    ? new Blob([content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength) as ArrayBuffer], { type: mimeType })
    : new Blob([content], { type: mimeType });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank'; // Add target blank to avoid Next.js routing intercepts
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  
  // Increased delay to 1000ms as 100ms was too fast for localhost
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

/** Helper: download CSV. */
export function downloadCSV(leads: RawLead[], exportType: ExportType, campaignName?: string): void {
  const csv = generateCSV(leads, exportType);
  const prefix = exportType === 'msg91' ? 'MSG91' : 'Leads';
  const suffix = campaignName ? `_${campaignName.replace(/\s+/g, '_')}` : '';
  downloadFile(csv, `${prefix}${suffix}.csv`, 'text/csv;charset=utf-8;');
}

/** Helper: download Excel. */
export function downloadExcel(leads: RawLead[], exportType: ExportType, campaignName?: string): void {
  const buffer = generateExcel(leads, exportType);
  const prefix = exportType === 'msg91' ? 'MSG91' : 'Leads';
  const suffix = campaignName ? `_${campaignName.replace(/\s+/g, '_')}` : '';
  downloadFile(buffer, `${prefix}${suffix}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
