import { useState, useMemo, type FormEvent, type ElementType } from 'react';
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
  ShieldCheckIcon,
  BuildingOffice2Icon,
  UserGroupIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Types                                                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */

const GROUPS = ['טכנולוג׳יקל גרופ', 'מפע״ם', 'נספחות', 'איי סטאר'] as const;
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
  group: Group;
  lodging: boolean;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Constants                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

const GROUP_COLORS: Record<Group, { bg: string; text: string; border: string; bar: string }> = {
  'טכנולוג׳יקל גרופ': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', bar: 'bg-blue-500' },
  'מפע״ם': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', bar: 'bg-amber-500' },
  'נספחות': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', bar: 'bg-rose-500' },
  'איי סטאר': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', bar: 'bg-emerald-500' },
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
    passportControl: true, group: 'טכנולוג׳יקל גרופ', lodging: true,
  },
  {
    id: 'seed-2', organization: 'אמ"ן', rankHebrew: 'סגן', rankEnglish: 'Lieutenant',
    fullNameHebrew: 'קאי שרעבני', fullNameEnglish: 'Kai Sharabani',
    personalId: '7234567', nationalId: '023456789', passportNumber: '22345678',
    birthDate: '1992-08-22', phone: '053-2345678',
    passportControl: false, group: 'מפע״ם', lodging: true,
  },
  {
    id: 'seed-3', organization: 'חיל האוויר', rankHebrew: 'רב סרן', rankEnglish: 'Major',
    fullNameHebrew: 'שחר לוי', fullNameEnglish: 'Shachar Levi',
    personalId: '7345678', nationalId: '034567890', passportNumber: '23456789',
    birthDate: '1988-12-03', phone: '054-3456789',
    passportControl: true, group: 'נספחות', lodging: false,
  },
  {
    id: 'seed-4', organization: 'מג"ן', rankHebrew: 'סמל', rankEnglish: 'Sergeant',
    fullNameHebrew: 'עידו דולב', fullNameEnglish: 'Ido Dolev',
    personalId: '7456789', nationalId: '045678901', passportNumber: '24567890',
    birthDate: '1995-03-17', phone: '055-4567890',
    passportControl: false, group: 'איי סטאר', lodging: true,
  },
  {
    id: 'seed-5', organization: 'חיל הים', rankHebrew: 'טוראי', rankEnglish: 'Private',
    fullNameHebrew: 'יובל רונד', fullNameEnglish: 'Yuval Rond',
    personalId: '7567890', nationalId: '056789012', passportNumber: '25678901',
    birthDate: '1998-07-29', phone: '056-5678901',
    passportControl: true, group: 'טכנולוג׳יקל גרופ', lodging: false,
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
/*  Blank form template                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */

const BLANK: Omit<Personnel, 'id'> = {
  organization: '', rankHebrew: '', rankEnglish: '',
  fullNameHebrew: '', fullNameEnglish: '',
  personalId: '', nationalId: '', passportNumber: '',
  birthDate: '', phone: '',
  passportControl: false, group: GROUPS[0], lodging: false,
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  KPI Card                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */

function KPICard({ icon: Icon, label, value, color }: {
  icon: ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-4 shadow-sm">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Dashboard                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

function Dashboard({ data }: { data: Personnel[] }) {
  const total = data.length;
  const lodgingCount = data.filter(p => p.lodging).length;
  const passportCount = data.filter(p => p.passportControl).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">דשבורד</h1>
      <p className="text-sm text-slate-500 mb-8">סקירה כללית של כוח האדם</p>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <KPICard icon={UserGroupIcon} label="סה״כ אנשי צוות" value={total} color="bg-indigo-500" />
        <KPICard icon={BuildingOffice2Icon} label="נדרש לינה" value={lodgingCount} color="bg-teal-500" />
        <KPICard icon={ShieldCheckIcon} label="ביקורת דרכונים" value={passportCount} color="bg-amber-500" />
      </div>

      {/* Group Distribution */}
      <h2 className="text-lg font-semibold text-slate-800 mb-4">התפלגות לפי קבוצות</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {GROUPS.map(group => {
          const count = data.filter(p => p.group === group).length;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const colors = GROUP_COLORS[group];
          return (
            <div key={group} className={`rounded-xl border p-5 ${colors.bg} ${colors.border}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-semibold ${colors.text}`}>{group}</span>
                <span className={`text-2xl font-bold ${colors.text}`}>{count}</span>
              </div>
              <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className={`text-xs mt-1.5 ${colors.text} opacity-70`}>{pct}% מסך הכל</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Personnel Modal (Add / Edit)                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */

function PersonnelModal({ mode, initial, onSave, onClose }: {
  mode: 'add' | 'edit';
  initial: Omit<Personnel, 'id'>;
  onSave: (data: Omit<Personnel, 'id'>) => void;
  onClose: () => void;
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
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">טלפון</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} type="tel" />
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
            <label className="flex items-center gap-2.5 cursor-pointer pt-3">
              <input
                type="checkbox"
                checked={form.lodging}
                onChange={e => set('lodging', e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 accent-indigo-600"
              />
              <span className="text-sm text-slate-700">לינה נדרשת</span>
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

function ManagementView({ data, onChange }: {
  data: Personnel[];
  onChange: (updated: Personnel[]) => void;
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
      updated = data.map(p => p.id === modal.editId ? { ...p, ...formData } : p);
    } else {
      updated = [...data, { ...formData, id: uuid() }];
    }
    onChange(updated);
    setModal(null);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">ניהול כוח אדם</h1>
          <p className="text-sm text-slate-500">{data.length} רשומות במערכת</p>
        </div>
        <button
          onClick={() => setModal({ mode: 'add', initial: { ...BLANK } })}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
        >
          <PlusIcon className="w-4 h-4" />
          הוסף איש צוות
        </button>
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
                <SortTh label="לינה" field="lodging" />
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
                const gc = GROUP_COLORS[p.group];
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
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full ${p.lodging ? 'bg-teal-500' : 'bg-slate-300'}`}
                        title={p.lodging ? 'כן' : 'לא'}
                      />
                    </td>
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
/*  Main App                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */

type View = 'dashboard' | 'manage';

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [data, setData] = useState<Personnel[]>(load);

  const handleChange = (updated: Personnel[]) => {
    setData(updated);
    persist(updated);
  };

  const nav: { id: View; label: string; icon: ElementType }[] = [
    { id: 'dashboard', label: 'דשבורד', icon: Squares2X2Icon },
    { id: 'manage', label: 'ניהול כוח אדם', icon: ClipboardDocumentListIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex" dir="rtl">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-l border-slate-200 flex flex-col fixed inset-y-0 right-0 z-10 shadow-sm">
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
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
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
        <div className="px-5 py-4 border-t border-slate-100">
          <p className="text-xs text-slate-400">{data.length} רשומות במאגר</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 mr-60 min-h-screen">
        <div className="max-w-6xl mx-auto p-8">
          {view === 'dashboard'
            ? <Dashboard data={data} />
            : <ManagementView data={data} onChange={handleChange} />
          }
        </div>
      </main>
    </div>
  );
}
