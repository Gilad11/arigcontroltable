/**
 * Google Sheets Sync Service
 *
 * Connects to a Google Apps Script Web App deployed from the spreadsheet.
 * Set VITE_GOOGLE_SCRIPT_URL in .env to enable.
 */

export interface Personnel {
  id: string;
  organization: string;
  rankHebrew: string;
  rankEnglish: string;
  fullNameHebrew: string;
  fullNameEnglish: string;
  personalId: string;
  nationalId: string;
  passportNumber: string;
  birthDate: string;
  phone: string;
  passportControl: boolean;
  group: string;
  hotel: string;
}

const SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL as string | undefined;

export function isGoogleSheetsEnabled(): boolean {
  return !!SCRIPT_URL && SCRIPT_URL.length > 10;
}

/** Fetch all personnel from Google Sheets */
export async function fetchPersonnel(): Promise<Personnel[]> {
  if (!SCRIPT_URL) throw new Error('VITE_GOOGLE_SCRIPT_URL not configured');

  const res = await fetch(SCRIPT_URL);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch');

  return (json.data as Personnel[]).map(p => ({
    ...p,
    passportControl: (() => {
      const raw = String(p.passportControl ?? '').trim();
      // "החלקה" or legacy boolean false → false (red). Everything else → true (green default)
      return raw !== 'החלקה' && raw !== 'false' && raw !== 'FALSE';
    })(),
  }));
}

/** Add a new personnel record */
export async function addPersonnel(record: Personnel): Promise<void> {
  if (!SCRIPT_URL) throw new Error('VITE_GOOGLE_SCRIPT_URL not configured');

  await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'add', record }),
  });
}

/** Update an existing personnel record */
export async function updatePersonnel(record: Personnel): Promise<void> {
  if (!SCRIPT_URL) throw new Error('VITE_GOOGLE_SCRIPT_URL not configured');

  await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'update', record }),
  });
}

/** Delete a personnel record by ID */
export async function deletePersonnel(id: string): Promise<void> {
  if (!SCRIPT_URL) throw new Error('VITE_GOOGLE_SCRIPT_URL not configured');

  await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'delete', id }),
  });
}

/** Full sync — overwrite sheet with local data */
export async function syncAllPersonnel(records: Personnel[]): Promise<void> {
  if (!SCRIPT_URL) throw new Error('VITE_GOOGLE_SCRIPT_URL not configured');

  await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'sync', records }),
  });
}
