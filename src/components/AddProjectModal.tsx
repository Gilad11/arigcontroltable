import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { v4 as uuidv4 } from 'uuid';
import type { ProjectData, ProjectStatus } from '../types';
import { STATUS_OPTIONS } from '../types';

interface Props {
  onAdd: (project: ProjectData) => void;
  onClose: () => void;
}

const EMPTY: Omit<ProjectData, 'id'> = {
  projectName: '',
  clientName: '',
  status: 'ממתין',
  startDate: '',
  endDate: '',
  budget: 0,
  notes: '',
};

export default function AddProjectModal({ onAdd, onClose }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof EMPTY, string>>>({});

  function validate() {
    const e: typeof errors = {};
    if (!form.projectName.trim()) e.projectName = 'שדה חובה';
    if (!form.clientName.trim()) e.clientName = 'שדה חובה';
    if (!form.startDate) e.startDate = 'שדה חובה';
    if (!form.endDate) e.endDate = 'שדה חובה';
    if (form.budget < 0) e.budget = 'ערך חיובי בלבד';
    return e;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onAdd({ ...form, id: uuidv4() });
    onClose();
  }

  function set<K extends keyof typeof EMPTY>(key: K, val: (typeof EMPTY)[K]) {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => { const copy = { ...e }; delete copy[key]; return copy; });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">הוספת פרויקט חדש</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <XMarkIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="שם הפרויקט" error={errors.projectName} className="col-span-2">
              <input
                className={inputCls(!!errors.projectName)}
                placeholder="לדוגמה: מערכת CRM"
                value={form.projectName}
                onChange={e => set('projectName', e.target.value)}
              />
            </Field>
            <Field label="שם הלקוח" error={errors.clientName} className="col-span-2">
              <input
                className={inputCls(!!errors.clientName)}
                placeholder={'לדוגמה: חברה בע"מ'}
                value={form.clientName}
                onChange={e => set('clientName', e.target.value)}
              />
            </Field>
            <Field label="סטטוס">
              <select
                className={inputCls(false)}
                value={form.status}
                onChange={e => set('status', e.target.value as ProjectStatus)}
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="תקציב (₪)" error={errors.budget}>
              <input
                type="number"
                min="0"
                className={inputCls(!!errors.budget)}
                value={form.budget}
                onChange={e => set('budget', Number(e.target.value))}
              />
            </Field>
            <Field label="תאריך התחלה" error={errors.startDate}>
              <input
                type="date"
                className={inputCls(!!errors.startDate)}
                value={form.startDate}
                onChange={e => set('startDate', e.target.value)}
              />
            </Field>
            <Field label="תאריך סיום משוער" error={errors.endDate}>
              <input
                type="date"
                className={inputCls(!!errors.endDate)}
                value={form.endDate}
                onChange={e => set('endDate', e.target.value)}
              />
            </Field>
            <Field label="הערות" className="col-span-2">
              <textarea
                rows={3}
                className={inputCls(false) + ' resize-none'}
                placeholder="הערות נוספות..."
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
              />
            </Field>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
              ביטול
            </button>
            <button type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors">
              הוסף פרויקט
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `w-full px-3 py-2 text-sm rounded-lg border transition-colors outline-none focus:ring-2 focus:ring-teal-500/30 ${
    hasError ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-white hover:border-slate-300 focus:border-teal-500'
  }`;
}

function Field({ label, error, children, className = '' }: {
  label: string; error?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
}
