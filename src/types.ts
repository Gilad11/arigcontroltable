export type ProjectStatus = 'בתהליך' | 'הושלם' | 'ממתין' | 'בוטל';

export interface ProjectData {
  id: string;
  projectName: string;
  clientName: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  budget: number;
  notes: string;
}

export const STATUS_OPTIONS: ProjectStatus[] = ['בתהליך', 'הושלם', 'ממתין', 'בוטל'];

export const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; bg: string; dot: string }> = {
  'בתהליך': { label: 'בתהליך', color: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-500' },
  'הושלם':  { label: 'הושלם',  color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  'ממתין':  { label: 'ממתין',  color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500' },
  'בוטל':   { label: 'בוטל',   color: 'text-rose-700', bg: 'bg-rose-50', dot: 'bg-rose-500' },
};
