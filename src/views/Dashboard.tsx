import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table';
import {
  FolderOpenIcon,
  CurrencyDollarIcon,
  CheckBadgeIcon,
  ArrowTrendingUpIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { ProjectData, ProjectStatus } from '../types';
import { STATUS_CONFIG, STATUS_OPTIONS } from '../types';
import StatusBadge from '../components/StatusBadge';

interface Props {
  projects: ProjectData[];
}

const col = createColumnHelper<ProjectData>();

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);

const STATUS_CHART_COLORS: Record<ProjectStatus, string> = {
  'בתהליך': '#3b82f6',
  'הושלם':  '#10b981',
  'ממתין':  '#f59e0b',
  'בוטל':   '#f43f5e',
};

export default function Dashboard({ projects }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'הכל'>('הכל');

  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter(p => p.status === 'בתהליך').length;
    const completed = projects.filter(p => p.status === 'הושלם').length;
    const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
    const statusCounts = STATUS_OPTIONS.map(s => ({
      name: s,
      value: projects.filter(p => p.status === s).length,
    }));
    return { total, active, completed, totalBudget, statusCounts };
  }, [projects]);

  const filtered = useMemo(
    () => statusFilter === 'הכל' ? projects : projects.filter(p => p.status === statusFilter),
    [projects, statusFilter],
  );

  const columns = [
    col.accessor('projectName', {
      header: 'שם הפרויקט',
      cell: ({ getValue }) => <span className="font-medium text-slate-800">{getValue()}</span>,
    }),
    col.accessor('clientName', {
      header: 'לקוח',
      cell: ({ getValue }) => <span className="text-slate-500">{getValue()}</span>,
    }),
    col.accessor('status', {
      header: 'סטטוס',
      cell: ({ getValue }) => <StatusBadge status={getValue()} size="sm" />,
    }),
    col.accessor('endDate', {
      header: 'סיום משוער',
      cell: ({ getValue }) => <span className="text-slate-500 text-sm">{getValue()}</span>,
    }),
    col.accessor('budget', {
      header: 'תקציב',
      cell: ({ getValue }) => <span className="font-medium text-slate-700 tabular-nums">{formatCurrency(getValue())}</span>,
    }),
  ];

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const kpis = [
    { label: 'סה"כ פרויקטים', value: stats.total, icon: FolderOpenIcon, color: 'text-slate-600', bg: 'bg-slate-100' },
    { label: 'פרויקטים פעילים', value: stats.active, icon: ArrowTrendingUpIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'תקציב כולל', value: formatCurrency(stats.totalBudget), icon: CurrencyDollarIcon, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'הושלמו', value: stats.completed, icon: CheckBadgeIcon, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">דשבורד</h1>
        <p className="text-sm text-slate-500 mt-0.5">סקירה כוללת של תיק הפרויקטים</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{kpi.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">{kpi.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.bg}`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pie Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm lg:col-span-1">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">התפלגות לפי סטטוס</h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={stats.statusCounts}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
              >
                {stats.statusCounts.map(entry => (
                  <Cell key={entry.name} fill={STATUS_CHART_COLORS[entry.name as ProjectStatus]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {stats.statusCounts.map(s => (
              <div key={s.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_CHART_COLORS[s.name as ProjectStatus] }} />
                  <span className="text-xs text-slate-600">{s.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${projects.length ? (s.value / projects.length) * 100 : 0}%`,
                        background: STATUS_CHART_COLORS[s.name as ProjectStatus],
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-700 w-4 text-right">{s.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Budget by status */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">תקציב לפי סטטוס</h2>
          <div className="space-y-3">
            {STATUS_OPTIONS.map(s => {
              const total = projects.filter(p => p.status === s).reduce((sum, p) => sum + p.budget, 0);
              const max = Math.max(...STATUS_OPTIONS.map(st => projects.filter(p => p.status === st).reduce((sum, p) => sum + p.budget, 0)), 1);
              const cfg = STATUS_CONFIG[s];
              return (
                <div key={s}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <span className="text-xs text-slate-600">{s}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-700 tabular-nums">{formatCurrency(total)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${cfg.dot}`}
                      style={{ width: `${(total / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-slate-700">סקירת פרויקטים</h2>
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {(['הכל', ...STATUS_OPTIONS] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  statusFilter === s
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id} className="border-b border-slate-100 bg-slate-50/60">
                  {hg.headers.map(header => (
                    <th key={header.id} className="px-4 py-3 text-right font-medium text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">
                      <div
                        className={`flex items-center gap-1 justify-end ${header.column.getCanSort() ? 'cursor-pointer select-none hover:text-slate-800 transition-colors' : ''}`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span className="flex flex-col opacity-40">
                            <ChevronUpIcon className={`w-2.5 h-2.5 ${header.column.getIsSorted() === 'asc' ? 'opacity-100 text-teal-600' : ''}`} />
                            <ChevronDownIcon className={`w-2.5 h-2.5 -mt-0.5 ${header.column.getIsSorted() === 'desc' ? 'opacity-100 text-teal-600' : ''}`} />
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">
                    לא נמצאו פרויקטים
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, i) => (
                  <tr key={row.id} className={`border-b border-slate-50 transition-colors ${i % 2 === 0 ? 'bg-white hover:bg-slate-50/60' : 'bg-slate-50/30 hover:bg-slate-50/60'}`}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-3.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
