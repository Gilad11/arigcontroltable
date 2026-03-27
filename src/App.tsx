import { useState, useMemo, useEffect, useCallback, useRef, type FormEvent, type ElementType } from 'react';
import { v4 as uuid } from 'uuid';
import {
  Squares2X2Icon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ArrowsUpDownIcon,
  ArrowDownTrayIcon,
  BuildingOffice2Icon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import {
  isGoogleSheetsEnabled,
  fetchPersonnel,
  addPersonnel,
  updatePersonnel,
  deletePersonnel,
  syncAllPersonnel,
} from './lib/googleSheets';

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Types                                                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */

const GROUPS = ['טכנולוג׳יקל גרופ', 'כיפה', 'מפע״ם', 'נספחות', 'איי סטאר', 'מש״ב'] as const;
type Group = (typeof GROUPS)[number];

interface Personnel {
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

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Constants                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

/** Normalize group names: Google Sheets may use " instead of ״ */
function normalizeGroup(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/\u0022/g, '\u05F4')   // ASCII double-quote → Hebrew gershayim ״
    .replace(/\u0027/g, '\u05F3')   // ASCII single-quote → Hebrew geresh ׳
    .replace(/\u201C/g, '\u05F4')   // Left smart-quote → gershayim
    .replace(/\u201D/g, '\u05F4')   // Right smart-quote → gershayim
    .trim();
}

/** Find the matching canonical group name, or return the raw string */
function matchGroup(raw: string): string {
  const norm = normalizeGroup(raw);
  return GROUPS.find(g => g === norm) || norm;
}

const DEFAULT_GROUP_COLOR = { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', bar: 'bg-slate-500' };

const GROUP_COLORS: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  'טכנולוג׳יקל גרופ': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', bar: 'bg-blue-500' },
  'כיפה': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', bar: 'bg-cyan-500' },
  'מפע״ם': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', bar: 'bg-amber-500' },
  'נספחות': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', bar: 'bg-rose-500' },
  'איי סטאר': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', bar: 'bg-emerald-500' },
  'מש״ב': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', bar: 'bg-purple-500' },
};

/** Safe color lookup — always returns a valid color set */
function getGroupColor(group: string) {
  const matched = matchGroup(group);
  return GROUP_COLORS[matched] || DEFAULT_GROUP_COLOR;
}

const GROUP_POC: Record<string, string> = {
  'טכנולוג׳יקל גרופ': 'דני רייזמן',
  'כיפה': 'פטר סילאגי',
  'מפע״ם': 'מני עיברי',
  'איי סטאר': 'עמיחי טרייבר',
  'מש״ב': 'נג׳יב איסמעיל',
  'נספחות': 'שחר פיינמסר',
};

/* Default hotel security ratings (1-5) */
const DEFAULT_HOTEL_RATINGS: Record<string, number> = {
  'Shangri-La': 5,
  'Dusit-Thani': 4,
  'VOGO': 2,
  'W': 3,
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Seed Data                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

const SEED: Personnel[] = [
  {
    id: 'seed-1', organization: 'יחידה 8200', rankHebrew: 'סרן', rankEnglish: 'Captain',
    fullNameHebrew: 'גלעד נפתלי', fullNameEnglish: 'Gilad Naftali',
    personalId: '7123456', nationalId: '012345678', passportNumber: '21234567',
    birthDate: '1990-05-15', phone: '052-1234567',
    passportControl: true, group: 'טכנולוג׳יקל גרופ', hotel: 'Shangri-La',
  },
  {
    id: 'seed-2', organization: 'אמ"ן', rankHebrew: 'סגן', rankEnglish: 'Lieutenant',
    fullNameHebrew: 'קאי שרעבני', fullNameEnglish: 'Kai Sharabani',
    personalId: '7234567', nationalId: '023456789', passportNumber: '22345678',
    birthDate: '1992-08-22', phone: '053-2345678',
    passportControl: false, group: 'מפע״ם', hotel: 'Dusit-Thani',
  },
  {
    id: 'seed-3', organization: 'חיל האוויר', rankHebrew: 'רב סרן', rankEnglish: 'Major',
    fullNameHebrew: 'שחר לוי', fullNameEnglish: 'Shachar Levi',
    personalId: '7345678', nationalId: '034567890', passportNumber: '23456789',
    birthDate: '1988-12-03', phone: '054-3456789',
    passportControl: true, group: 'נספחות', hotel: '',
  },
  {
    id: 'seed-4', organization: 'מג"ן', rankHebrew: 'סמל', rankEnglish: 'Sergeant',
    fullNameHebrew: 'עידו דולב', fullNameEnglish: 'Ido Dolev',
    personalId: '7456789', nationalId: '045678901', passportNumber: '24567890',
    birthDate: '1995-03-17', phone: '055-4567890',
    passportControl: false, group: 'איי סטאר', hotel: 'W',
  },
  {
    id: 'seed-5', organization: 'חיל הים', rankHebrew: 'טוראי', rankEnglish: 'Private',
    fullNameHebrew: 'יובל רונד', fullNameEnglish: 'Yuval Rond',
    personalId: '7567890', nationalId: '056789012', passportNumber: '25678901',
    birthDate: '1998-07-29', phone: '056-5678901',
    passportControl: true, group: 'טכנולוג׳יקל גרופ', hotel: 'VOGO',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Storage                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

const STORAGE_KEY = 'personnel_mgmt';

function load(): Personnel[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Personnel[]) : SEED;
  } catch {
    return SEED;
  }
}

function persist(data: Personnel[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Google Sheets Sync Hook                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

function useSheetsSync(data: Personnel[], setData: (d: Personnel[]) => void) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string>('');
  const enabled = isGoogleSheetsEnabled();
  const isInitialLoad = useRef(true);

  /** Pull data from Google Sheets */
  const pullFromSheets = useCallback(async () => {
    if (!enabled) return;
    setSyncStatus('syncing');
    setSyncError('');
    try {
      const remote = await fetchPersonnel();
      if (remote.length > 0) {
        setData(remote);
        persist(remote);
      }
      setLastSync(new Date());
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'שגיאת סנכרון');
      setSyncStatus('error');
    }
  }, [enabled, setData]);

  /** Push all local data to Google Sheets (overwrite) */
  const pushToSheets = useCallback(async () => {
    if (!enabled) return;
    setSyncStatus('syncing');
    setSyncError('');
    try {
      await syncAllPersonnel(data);
      setLastSync(new Date());
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'שגיאת סנכרון');
      setSyncStatus('error');
    }
  }, [enabled, data]);

  /** Single record operations */
  const sheetAdd = useCallback(async (record: Personnel) => {
    if (!enabled) return;
    try { await addPersonnel(record); } catch { /* silent */ }
  }, [enabled]);

  const sheetUpdate = useCallback(async (record: Personnel) => {
    if (!enabled) return;
    try { await updatePersonnel(record); } catch { /* silent */ }
  }, [enabled]);

  const sheetDelete = useCallback(async (id: string) => {
    if (!enabled) return;
    try { await deletePersonnel(id); } catch { /* silent */ }
  }, [enabled]);

  // Auto-pull on first load if enabled
  useEffect(() => {
    if (enabled && isInitialLoad.current) {
      isInitialLoad.current = false;
      pullFromSheets();
    }
  }, [enabled, pullFromSheets]);

  return {
    enabled,
    syncStatus,
    lastSync,
    syncError,
    pullFromSheets,
    pushToSheets,
    sheetAdd,
    sheetUpdate,
    sheetDelete,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Utilities                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */

function phoneToWhatsApp(phone: string) {
  const digits = phone.replace(/\D/g, '');
  const intl = digits.startsWith('0') ? '972' + digits.slice(1) : digits;
  return `https://wa.me/${intl}`;
}

function exportToExcel(data: Personnel[], filename: string) {
  const headers = ['#', 'שם מלא', 'דרגה', 'גוף', 'מ.א', 'ת.ז', 'טלפון', 'קבוצה', 'מלון', 'ביקורת דרכונים'];
  const rows = data.map((p, i) => [
    i + 1, p.fullNameHebrew, p.rankHebrew, p.organization,
    p.personalId, p.nationalId, p.phone, p.group, p.hotel || '', p.passportControl ? 'כן' : 'לא',
  ]);
  const tableHtml = `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>כוח אדם</x:Name><x:WorksheetOptions><x:DisplayRightToLeft/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>${tableHtml}</body></html>`;
  const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${filename}.xls`; a.click();
  URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Live Clock                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const date = now.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const time = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const segments = time.split(':'); // [HH, MM, SS]
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-slate-900 via-slate-800 to-indigo-900 px-4 py-5 sm:p-6 mb-6 shadow-xl">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-40 h-40 bg-indigo-500/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full translate-x-1/4 translate-y-1/4" />
      <div className="absolute top-3 left-4 sm:top-4 sm:left-6 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
        </span>
        <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">Live</span>
      </div>
      <div className="relative flex flex-col items-center sm:items-end pt-6 sm:pt-2">
        <p className="text-base sm:text-3xl font-extrabold text-white tracking-tight text-center sm:text-right leading-snug">{date}</p>
        {/* Force LTR so HH:MM:SS renders correctly in RTL page */}
        <div dir="ltr" className="flex items-baseline gap-0.5 sm:gap-1 font-mono mt-2">
          <span className="text-lg sm:text-2xl font-bold text-white bg-white/10 rounded-md sm:rounded-lg px-1.5 sm:px-2 py-0.5">{segments[0]}</span>
          <span className="text-indigo-400 text-base sm:text-xl animate-pulse">:</span>
          <span className="text-lg sm:text-2xl font-bold text-white bg-white/10 rounded-md sm:rounded-lg px-1.5 sm:px-2 py-0.5">{segments[1]}</span>
          <span className="text-indigo-400 text-base sm:text-xl animate-pulse">:</span>
          <span className="text-lg sm:text-2xl font-bold text-white bg-white/10 rounded-md sm:rounded-lg px-1.5 sm:px-2 py-0.5">{segments[2]}</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Sync Status Bar                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */

function SyncBar({ syncStatus, lastSync, syncError, onPull, onPush, enabled }: {
  syncStatus: SyncStatus;
  lastSync: Date | null;
  syncError: string;
  onPull: () => void;
  onPush: () => void;
  enabled: boolean;
}) {
  if (!enabled) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50/80 border border-amber-200/60 rounded-xl mb-5 text-sm backdrop-blur-sm">
        <ExclamationCircleIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <span className="text-amber-700 text-xs">Google Sheets לא מחובר — הנתונים נשמרים מקומית בלבד</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-slate-50/80 border border-slate-200/60 rounded-xl mb-5 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        {syncStatus === 'syncing' && <ArrowPathIcon className="w-3.5 h-3.5 text-indigo-500 animate-spin" />}
        {syncStatus === 'success' && <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />}
        {syncStatus === 'error' && <ExclamationCircleIcon className="w-3.5 h-3.5 text-red-500" />}
        {syncStatus === 'idle' && <CloudArrowUpIcon className="w-3.5 h-3.5 text-slate-400" />}
        <span className="text-[11px] text-slate-500">
          {syncStatus === 'syncing' && 'מסנכרן...'}
          {syncStatus === 'success' && 'סנכרון הושלם'}
          {syncStatus === 'error' && (syncError || 'שגיאה')}
          {syncStatus === 'idle' && (lastSync
            ? `סונכרן: ${lastSync.toLocaleTimeString('he-IL')}`
            : 'Sheets מחובר'
          )}
        </span>
      </div>
      <div className="flex-1" />
      <button
        onClick={onPull}
        disabled={syncStatus === 'syncing'}
        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition disabled:opacity-50"
      >
        <CloudArrowDownIcon className="w-3 h-3" />
        משוך
      </button>
      <button
        onClick={onPush}
        disabled={syncStatus === 'syncing'}
        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition disabled:opacity-50"
      >
        <CloudArrowUpIcon className="w-3 h-3" />
        דחוף
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Blank form template                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */

const BLANK: Omit<Personnel, 'id'> = {
  organization: '', rankHebrew: '', rankEnglish: '',
  fullNameHebrew: '', fullNameEnglish: '',
  personalId: '', nationalId: '', passportNumber: '',
  birthDate: '', phone: '',
  passportControl: false, group: GROUPS[0], hotel: '',
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  KPI Card                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */

function KPICard({ icon: Icon, label, value, color, gradient }: {
  icon: ElementType;
  label: string;
  value: number;
  color: string;
  gradient?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-xl sm:rounded-2xl border p-4 sm:p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${gradient || 'bg-white border-slate-200'}`}>
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center ${color} shadow-lg shadow-current/20`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div className="text-left">
          <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-none">{value}</p>
        </div>
      </div>
      <p className="text-xs sm:text-sm font-medium text-slate-600 mt-2 sm:mt-3">{label}</p>
      <div className={`absolute -bottom-2 -left-2 w-20 h-20 rounded-full opacity-[0.04] ${color}`} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Dashboard                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} className={`w-4 h-4 ${i <= rating ? 'text-amber-400' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function Dashboard({ data, onViewHotel, syncProps }: {
  data: Personnel[];
  onViewHotel: (hotel: string) => void;
  syncProps: {
    syncStatus: SyncStatus;
    lastSync: Date | null;
    syncError: string;
    onPull: () => void;
    onPush: () => void;
    enabled: boolean;
  };
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('fullNameHebrew');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const total = data.length;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const DashSortTh = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      className="px-3 py-3 text-xs font-semibold text-slate-500 bg-slate-50 cursor-pointer hover:bg-slate-100 select-none transition"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center justify-center gap-1">
        {label}
        {sortKey === field
          ? (sortDir === 'asc'
            ? <ChevronUpIcon className="w-3 h-3" />
            : <ChevronDownIcon className="w-3 h-3" />)
          : <ArrowsUpDownIcon className="w-3 h-3 opacity-30" />}
      </div>
    </th>
  );

  const filtered = useMemo(() => {
    let list = [...data];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.fullNameHebrew.includes(q) || p.fullNameEnglish.toLowerCase().includes(q) ||
        p.organization.includes(q) || p.phone.includes(q) || p.group.includes(q) || p.hotel.includes(q)
      );
    }
    list.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === 'boolean' && typeof vb === 'boolean') {
        if (va === vb) return 0;
        return sortDir === 'asc' ? (va ? -1 : 1) : (va ? 1 : -1);
      }
      const cmp = String(va).localeCompare(String(vb), 'he');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [data, search, sortKey, sortDir]);

  const hotels = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(p => { if (p.hotel) map.set(p.hotel, (map.get(p.hotel) || 0) + 1); });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count, rating: DEFAULT_HOTEL_RATINGS[name] || 3 }));
  }, [data]);

  return (
    <div>
      {/* Live Header */}
      <LiveClock />

      {/* Google Sheets Sync */}
      <SyncBar {...syncProps} />

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <KPICard icon={UserGroupIcon} label="סה״כ אנשי צוות" value={total} color="bg-indigo-500" />
        <KPICard icon={BuildingOffice2Icon} label="שוהים במלונות" value={data.filter(p => p.hotel).length} color="bg-teal-500" />
      </div>

      {/* Group Distribution with POC */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 sm:h-6 bg-indigo-500 rounded-full" />
          <h2 className="text-base sm:text-lg font-bold text-slate-900">התפלגות לפי קבוצות</h2>
        </div>
        <button
          onClick={() => exportToExcel(filtered, 'dashboard_export')}
          className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] sm:text-xs font-semibold transition shadow-sm"
        >
          <ArrowDownTrayIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">ייצוא לאקסל</span>
          <span className="sm:hidden">אקסל</span>
        </button>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-8">
        {GROUPS.map(group => {
          const count = data.filter(p => matchGroup(p.group) === group).length;
          const colors = getGroupColor(group);
          const poc = GROUP_POC[group];
          return (
            <div key={group} className={`relative overflow-hidden rounded-xl sm:rounded-2xl border p-2.5 sm:p-4 transition-all hover:shadow-md hover:-translate-y-0.5 ${colors.bg} ${colors.border}`}>
              <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wide ${colors.text} leading-tight block`}>{group}</span>
              <p className={`text-2xl sm:text-3xl font-extrabold ${colors.text} leading-none mt-1`}>{count}</p>
              <div className="mt-2 sm:mt-3 pt-2 sm:pt-2.5 border-t border-current/10">
                <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium mb-0.5 hidden sm:block">איש קשר</p>
                <p className={`text-[10px] sm:text-xs font-bold ${colors.text} truncate`}>{poc}</p>
              </div>
              <div className={`absolute -bottom-3 -left-3 w-16 h-16 rounded-full opacity-[0.06] ${colors.bar}`} />
            </div>
          );
        })}
      </div>

      {/* Hotel Cards */}
      {hotels.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 bg-teal-500 rounded-full" />
            <h2 className="text-lg font-bold text-slate-900">מלונות</h2>
            <span className="text-xs text-slate-400 font-medium">({hotels.length})</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {hotels.map(h => (
              <button
                key={h.name}
                onClick={() => onViewHotel(h.name)}
                className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-lg hover:border-indigo-400 hover:-translate-y-1 transition-all text-right cursor-pointer"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-l from-indigo-500 via-blue-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center border border-indigo-100">
                    <BuildingOffice2Icon className="w-4.5 h-4.5 text-indigo-500" />
                  </div>
                  <span className="text-3xl font-extrabold text-slate-900 leading-none">{h.count}</span>
                </div>
                <p className="text-sm font-bold text-slate-800 mb-2">{h.name}</p>
                <StarRating rating={h.rating} />
                <p className="text-[10px] text-slate-400 mt-2 group-hover:text-indigo-500 transition-colors">לחץ לפרטים ←</p>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Search */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-slate-800 rounded-full" />
          <h2 className="text-lg font-bold text-slate-900">רשימת כוח אדם</h2>
          <span className="text-xs bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-full">{filtered.length}</span>
        </div>
      </div>
      <div className="relative mb-4">
        <MagnifyingGlassIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם, גוף, טלפון, קבוצה..."
          className="w-full pr-10 pl-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition shadow-sm"
        />
      </div>

      {/* Read-only personnel table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="px-3 py-3 text-xs font-semibold text-slate-500 bg-slate-50">#</th>
                <DashSortTh label="שם מלא" field="fullNameHebrew" />
                <DashSortTh label="דרגה" field="rankHebrew" />
                <DashSortTh label="גוף" field="organization" />
                <DashSortTh label="טלפון" field="phone" />
                <DashSortTh label="ביקורת דרכונים" field="passportControl" />
                <DashSortTh label="קבוצה" field="group" />
                <DashSortTh label="מלון" field="hotel" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">אין רשומות</td></tr>
              ) : filtered.map((p, idx) => {
                const gc = getGroupColor(p.group);
                return (
                  <tr key={p.id} className={`border-t border-slate-100 ${idx % 2 !== 0 ? 'bg-slate-50/50' : ''}`}>
                    <td className="px-3 py-2.5 text-center text-xs text-slate-400 font-mono">{idx + 1}</td>
                    <td className="px-3 py-2.5 text-sm font-medium text-slate-900 whitespace-nowrap">{p.fullNameHebrew}</td>
                    <td className="px-3 py-2.5 text-sm text-center">{p.rankHebrew}</td>
                    <td className="px-3 py-2.5 text-sm text-center">{p.organization}</td>
                    <td className="px-3 py-2.5 text-sm text-center font-mono">
                      {p.phone ? (
                        <a href={phoneToWhatsApp(p.phone)} target="_blank" rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-700 hover:underline">
                          {p.phone}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {p.passportControl ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span className="text-[10px] font-medium text-emerald-700">V</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-red-700">החלקה</span>
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium whitespace-nowrap ${gc.bg} ${gc.text} ${gc.border}`}>
                        {p.group}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-center">{p.hotel || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Hotel Detail View                                                        */
/* ═══════════════════════════════════════════════════════════════════════════ */

function HotelDetailView({ data, initialHotel, onBack }: {
  data: Personnel[];
  initialHotel: string;
  onBack: () => void;
}) {
  const allHotels = useMemo(() => {
    const set = new Set<string>();
    data.forEach(p => { if (p.hotel) set.add(p.hotel); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const [selectedHotel, setSelectedHotel] = useState(initialHotel);
  const guests = useMemo(() => data.filter(p => p.hotel === selectedHotel), [data, selectedHotel]);
  const rating = DEFAULT_HOTEL_RATINGS[selectedHotel] || 3;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 mb-4 transition">
        <ChevronDownIcon className="w-4 h-4 rotate-90" />
        חזרה לדשבורד
      </button>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">מלון {selectedHotel}</h1>
          <div className="flex items-center gap-3">
            <StarRating rating={rating} />
            <span className="text-sm text-slate-500">{guests.length} אורחים</span>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">החלפת מלון</label>
          <select
            value={selectedHotel}
            onChange={e => setSelectedHotel(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
          >
            {allHotels.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="px-3 py-3 text-xs font-semibold text-slate-500 bg-slate-50">#</th>
                <th className="px-3 py-3 text-xs font-semibold text-slate-500 bg-slate-50">שם מלא</th>
                <th className="px-3 py-3 text-xs font-semibold text-slate-500 bg-slate-50">דרגה</th>
                <th className="px-3 py-3 text-xs font-semibold text-slate-500 bg-slate-50">גוף</th>
                <th className="px-3 py-3 text-xs font-semibold text-slate-500 bg-slate-50">קבוצה</th>
                <th className="px-3 py-3 text-xs font-semibold text-slate-500 bg-slate-50">טלפון</th>
                <th className="px-3 py-3 text-xs font-semibold text-slate-500 bg-slate-50">ביקורת דרכונים</th>
              </tr>
            </thead>
            <tbody>
              {guests.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">אין אורחים במלון זה</td></tr>
              ) : guests.map((p, idx) => {
                const gc = getGroupColor(p.group);
                return (
                  <tr key={p.id} className={`border-t border-slate-100 ${idx % 2 !== 0 ? 'bg-slate-50/50' : ''}`}>
                    <td className="px-3 py-2.5 text-center text-xs text-slate-400 font-mono">{idx + 1}</td>
                    <td className="px-3 py-2.5 text-sm font-medium text-slate-900 whitespace-nowrap">{p.fullNameHebrew}</td>
                    <td className="px-3 py-2.5 text-sm text-center">{p.rankHebrew}</td>
                    <td className="px-3 py-2.5 text-sm text-center">{p.organization}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium whitespace-nowrap ${gc.bg} ${gc.text} ${gc.border}`}>
                        {p.group}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-center font-mono">{p.phone}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${p.passportControl ? 'bg-amber-500' : 'bg-slate-300'}`} title={p.passportControl ? 'כן' : 'לא'} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Personnel Modal (Add / Edit)                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */

function PersonnelModal({ mode, initial, onSave, onClose, hotels }: {
  mode: 'add' | 'edit';
  initial: Omit<Personnel, 'id'>;
  onSave: (data: Omit<Personnel, 'id'>) => void;
  onClose: () => void;
  hotels: string[];
}) {
  const [form, setForm] = useState<Omit<Personnel, 'id'>>(initial);

  const set = <K extends keyof Omit<Personnel, 'id'>>(key: K, val: Omit<Personnel, 'id'>[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.fullNameHebrew.trim()) return;
    onSave(form);
  };

  const inputCls = 'w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">
            {mode === 'add' ? 'הוספת איש צוות' : 'עריכת פרטים'}
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
            <XMarkIcon className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">שם מלא (עברית) *</label>
              <input value={form.fullNameHebrew} onChange={e => set('fullNameHebrew', e.target.value)} className={inputCls} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Full Name (English)</label>
              <input value={form.fullNameEnglish} onChange={e => set('fullNameEnglish', e.target.value)} className={inputCls} dir="ltr" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">דרגה (עברית)</label>
              <input value={form.rankHebrew} onChange={e => set('rankHebrew', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Rank (English)</label>
              <input value={form.rankEnglish} onChange={e => set('rankEnglish', e.target.value)} className={inputCls} dir="ltr" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">גוף</label>
              <input value={form.organization} onChange={e => set('organization', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">קבוצה *</label>
              <select value={form.group} onChange={e => set('group', e.target.value as Group)} className={inputCls}>
                {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">מ.א</label>
              <input value={form.personalId} onChange={e => set('personalId', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">ת.ז</label>
              <input value={form.nationalId} onChange={e => set('nationalId', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">מס׳ דרכון</label>
              <input value={form.passportNumber} onChange={e => set('passportNumber', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">תאריך לידה</label>
              <input type="date" value={form.birthDate} onChange={e => set('birthDate', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">טלפון</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} type="tel" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">מלון</label>
              <select value={form.hotel} onChange={e => set('hotel', e.target.value)} className={inputCls}>
                <option value="">— ללא מלון —</option>
                {hotels.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>

          {/* Boolean checkboxes */}
          <div className="flex flex-wrap gap-6 pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2.5 cursor-pointer pt-3">
              <input
                type="checkbox"
                checked={form.passportControl}
                onChange={e => set('passportControl', e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 accent-indigo-600"
              />
              <span className="text-sm text-slate-700">ביקורת דרכונים נדרשת</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-5 border-t border-slate-100">
          <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition">
            {mode === 'add' ? 'הוסף' : 'שמור שינויים'}
          </button>
          <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition">
            ביטול
          </button>
        </div>
      </form>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Confirm Delete Modal                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */

function ConfirmModal({ name, onConfirm, onCancel }: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-200">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2.5 bg-red-100 rounded-xl flex-shrink-0">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">מחיקת רשומה</h3>
            <p className="text-sm text-slate-500 mt-1">
              האם למחוק את <strong>{name}</strong>? פעולה זו בלתי הפיכה.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition">
            מחק
          </button>
          <button onClick={onCancel} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition">
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Management View                                                           */
/* ═══════════════════════════════════════════════════════════════════════════ */

type SortKey = keyof Personnel;

function ManagementView({ data, onChange, syncProps }: {
  data: Personnel[];
  onChange: (updated: Personnel[]) => void;
  syncProps: {
    syncStatus: SyncStatus;
    lastSync: Date | null;
    syncError: string;
    onPull: () => void;
    onPush: () => void;
    enabled: boolean;
    sheetAdd: (record: Personnel) => Promise<void>;
    sheetUpdate: (record: Personnel) => Promise<void>;
    sheetDelete: (id: string) => Promise<void>;
  };
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('fullNameHebrew');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [modal, setModal] = useState<{
    mode: 'add' | 'edit';
    editId?: string;
    initial: Omit<Personnel, 'id'>;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Personnel | null>(null);

  const filtered = useMemo(() => {
    let list = [...data];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.fullNameHebrew.includes(q) ||
        p.fullNameEnglish.toLowerCase().includes(q) ||
        p.organization.includes(q) ||
        p.personalId.includes(q) ||
        p.nationalId.includes(q) ||
        p.phone.includes(q)
      );
    }
    list.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === 'boolean' && typeof vb === 'boolean') {
        if (va === vb) return 0;
        return sortDir === 'asc' ? (va ? -1 : 1) : (va ? 1 : -1);
      }
      const cmp = String(va).localeCompare(String(vb), 'he');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [data, search, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleSave = (formData: Omit<Personnel, 'id'>) => {
    let updated: Personnel[];
    if (modal?.mode === 'edit' && modal.editId) {
      const record = { ...formData, id: modal.editId } as Personnel;
      updated = data.map(p => p.id === modal.editId ? record : p);
      syncProps.sheetUpdate(record);
    } else {
      const newRecord = { ...formData, id: uuid() } as Personnel;
      updated = [...data, newRecord];
      syncProps.sheetAdd(newRecord);
    }
    onChange(updated);
    setModal(null);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    syncProps.sheetDelete(deleteTarget.id);
    onChange(data.filter(p => p.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const SortTh = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      className="px-3 py-3 text-xs font-semibold text-slate-500 bg-slate-50 cursor-pointer hover:bg-slate-100 select-none transition"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center justify-center gap-1">
        {label}
        {sortKey === field
          ? (sortDir === 'asc'
            ? <ChevronUpIcon className="w-3 h-3" />
            : <ChevronDownIcon className="w-3 h-3" />)
          : <ArrowsUpDownIcon className="w-3 h-3 opacity-30" />}
      </div>
    </th>
  );

  return (
    <div>
      {/* Google Sheets Sync */}
      <SyncBar
        syncStatus={syncProps.syncStatus}
        lastSync={syncProps.lastSync}
        syncError={syncProps.syncError}
        onPull={syncProps.onPull}
        onPush={syncProps.onPush}
        enabled={syncProps.enabled}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">ניהול כוח אדם</h1>
          <p className="text-sm text-slate-500">{data.length} רשומות במערכת</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToExcel(filtered, 'personnel_export')}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span className="hidden sm:inline">ייצוא לאקסל</span>
            <span className="sm:hidden">אקסל</span>
          </button>
          <button
            onClick={() => setModal({ mode: 'add', initial: { ...BLANK } })}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm"
          >
            <PlusIcon className="w-4 h-4" />
            <span className="hidden sm:inline">הוסף איש צוות</span>
            <span className="sm:hidden">הוסף</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם, גוף, מ.א, ת.ז, טלפון..."
          className="w-full pr-10 pl-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="px-3 py-3 text-xs font-semibold text-slate-500 bg-slate-50 rounded-tr-xl">#</th>
                <SortTh label="שם מלא" field="fullNameHebrew" />
                <SortTh label="דרגה" field="rankHebrew" />
                <SortTh label="גוף" field="organization" />
                <SortTh label="מ.א" field="personalId" />
                <SortTh label="ת.ז" field="nationalId" />
                <SortTh label="טלפון" field="phone" />
                <SortTh label="קבוצה" field="group" />
                <SortTh label="מלון" field="hotel" />
                <SortTh label="ביקורת דרכונים" field="passportControl" />
                <th className="px-3 py-3 text-xs font-semibold text-slate-500 bg-slate-50 rounded-tl-xl">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-16 text-slate-400">
                    <UserGroupIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>לא נמצאו רשומות</p>
                  </td>
                </tr>
              ) : filtered.map((p, idx) => {
                const gc = getGroupColor(p.group);
                return (
                  <tr
                    key={p.id}
                    className={`border-t border-slate-100 hover:bg-slate-50 transition-colors ${idx % 2 !== 0 ? 'bg-slate-50/50' : ''}`}
                  >
                    <td className="px-3 py-2.5 text-center text-xs text-slate-400 font-mono">{idx + 1}</td>
                    <td className="px-3 py-2.5 text-sm font-medium text-slate-900 whitespace-nowrap">{p.fullNameHebrew}</td>
                    <td className="px-3 py-2.5 text-sm text-center">{p.rankHebrew}</td>
                    <td className="px-3 py-2.5 text-sm text-center">{p.organization}</td>
                    <td className="px-3 py-2.5 text-sm text-center font-mono">{p.personalId}</td>
                    <td className="px-3 py-2.5 text-sm text-center font-mono">{p.nationalId}</td>
                    <td className="px-3 py-2.5 text-sm text-center font-mono">{p.phone}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium whitespace-nowrap ${gc.bg} ${gc.text} ${gc.border}`}>
                        {p.group}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-center">{p.hotel || '—'}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full ${p.passportControl ? 'bg-amber-500' : 'bg-slate-300'}`}
                        title={p.passportControl ? 'כן' : 'לא'}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            const { id, ...rest } = p;
                            setModal({ mode: 'edit', editId: id, initial: rest });
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="ערוך"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="מחק"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {modal && (
        <PersonnelModal
          mode={modal.mode}
          initial={modal.initial}
          onSave={handleSave}
          onClose={() => setModal(null)}
          hotels={[...new Set(data.map(p => p.hotel).filter(Boolean))].sort()}
        />
      )}
      {deleteTarget && (
        <ConfirmModal
          name={deleteTarget.fullNameHebrew}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  PIN Authentication                                                        */
/* ═══════════════════════════════════════════════════════════════════════════ */

type Role = 'master' | 'viewer';

const PIN_MAP: Record<string, Role> = {
  '2410': 'master',
  '3674': 'viewer',
};

function PinScreen({ onAuth }: { onAuth: (role: Role) => void }) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigit = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    setError('');

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 4 digits entered
    if (value && index === 3) {
      const pin = next.join('');
      const role = PIN_MAP[pin];
      if (role) {
        onAuth(role);
      } else {
        setError('קוד שגוי');
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setDigits(['', '', '', '']);
          inputRefs.current[0]?.focus();
        }, 600);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length === 4) {
      const next = pasted.split('');
      setDigits(next);
      const role = PIN_MAP[pasted];
      if (role) {
        onAuth(role);
      } else {
        setError('קוד שגוי');
        setShake(true);
        setTimeout(() => { setShake(false); setDigits(['', '', '', '']); inputRefs.current[0]?.focus(); }, 600);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-500/30">
            <UserGroupIcon className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">מנהל כוח אדם</h1>
          <p className="text-sm text-indigo-300/70">Personnel Manager</p>
        </div>

        {/* PIN Box */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
          <p className="text-center text-sm font-medium text-indigo-200 mb-6">הזן קוד גישה</p>
          <div className={`flex justify-center gap-3 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`} dir="ltr" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className="w-14 h-16 text-center text-2xl font-bold rounded-xl bg-white/10 border-2 border-white/20 text-white focus:border-indigo-400 focus:bg-white/15 focus:outline-none transition-all caret-transparent"
              />
            ))}
          </div>
          {error && (
            <p className="text-center text-red-400 text-sm font-medium mt-4">{error}</p>
          )}
          <div className="mt-8 flex items-center gap-2 justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[11px] text-indigo-300/50">מערכת מאובטחת</span>
          </div>
        </div>
      </div>

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Main App                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */

type View = 'dashboard' | 'manage' | 'hotel';

export default function App() {
  const [role, setRole] = useState<Role | null>(null);

  if (!role) {
    return <PinScreen onAuth={setRole} />;
  }

  return <AuthenticatedApp role={role} onLogout={() => setRole(null)} />;
}

function AuthenticatedApp({ role, onLogout }: { role: Role; onLogout: () => void }) {
  const [view, setView] = useState<View>('dashboard');
  const [data, setData] = useState<Personnel[]>(load);
  const [hotelView, setHotelView] = useState<string>('');

  const handleChange = useCallback((updated: Personnel[]) => {
    setData(updated);
    persist(updated);
  }, []);

  const sync = useSheetsSync(data, handleChange);

  const isMaster = role === 'master';

  const nav: { id: View; label: string; icon: ElementType }[] = isMaster
    ? [
        { id: 'dashboard', label: 'דשבורד', icon: Squares2X2Icon },
        { id: 'manage', label: 'ניהול כוח אדם', icon: ClipboardDocumentListIcon },
      ]
    : [
        { id: 'dashboard', label: 'דשבורד', icon: Squares2X2Icon },
      ];

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex" dir="rtl">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Mobile top bar */}
      <div className="fixed top-0 right-0 left-0 z-30 bg-white border-b border-slate-200 flex items-center justify-between px-4 py-3 md:hidden shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center">
            <UserGroupIcon className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-slate-900">מנהל כוח אדם</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-slate-100 transition">
          <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {sidebarOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            }
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`w-60 bg-white border-l border-slate-200 flex flex-col fixed inset-y-0 right-0 z-30 shadow-sm transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0`}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-sm">
            <UserGroupIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 leading-tight">מנהל כוח אדם</p>
            <p className="text-xs text-slate-400">Personnel Manager</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(item => {
            const active = item.id === 'dashboard' ? (view === 'dashboard' || view === 'hotel') : view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setView(item.id as View); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isMaster ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {isMaster ? 'מנהל' : 'צופה'}
            </span>
            <p className="text-xs text-slate-400">{data.length} רשומות</p>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            התנתק
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:mr-60 min-h-screen pt-14 md:pt-0 overflow-x-hidden">
        <div className="max-w-6xl mx-auto px-3 py-4 sm:p-6 lg:p-8">
          {view === 'hotel' && hotelView
            ? <HotelDetailView data={data} initialHotel={hotelView} onBack={() => setView('dashboard')} />
            : (view === 'manage' && isMaster)
              ? <ManagementView
                  data={data}
                  onChange={handleChange}
                  syncProps={{
                    syncStatus: sync.syncStatus,
                    lastSync: sync.lastSync,
                    syncError: sync.syncError,
                    onPull: sync.pullFromSheets,
                    onPush: sync.pushToSheets,
                    enabled: sync.enabled,
                    sheetAdd: sync.sheetAdd,
                    sheetUpdate: sync.sheetUpdate,
                    sheetDelete: sync.sheetDelete,
                  }}
                />
              : <Dashboard
                  data={data}
                  onViewHotel={(hotel) => { setHotelView(hotel); setView('hotel'); }}
                  syncProps={{
                    syncStatus: sync.syncStatus,
                    lastSync: sync.lastSync,
                    syncError: sync.syncError,
                    onPull: sync.pullFromSheets,
                    onPush: sync.pushToSheets,
                    enabled: sync.enabled,
                  }}
                />
          }
        </div>
      </main>
    </div>
  );
}
