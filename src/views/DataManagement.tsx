import { useState, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  PencilSquareIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import type { ProjectData, ProjectStatus } from '../types';
import { STATUS_OPTIONS } from '../types';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';
import AddProjectModal from '../components/AddProjectModal';

interface Props {
  projects: ProjectData[];
  onChange: (projects: ProjectData[]) => void;
}

const col = createColumnHelper<ProjectData>();

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);

export default function DataManagement({ projects, onChange }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<ProjectData>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const startEdit = useCallback((row: ProjectData) => {
    setEditingId(row.id);
    setEditValues({ ...row });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditValues({});
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingId) return;
    onChange(projects.map(p => p.id === editingId ? { ...p, ...editValues } as ProjectData : p));
    setEditingId(null);
    setEditValues({});
  }, [editingId, editValues, projects, onChange]);

  const confirmDelete = useCallback(() => {
    if (!deleteId) return;
    onChange(projects.filter(p => p.id !== deleteId));
    setDeleteId(null);
  }, [deleteId, projects, onChange]);

  const addProject = useCallback((project: ProjectData) => {
    onChange([project, ...projects]);
  }, [projects, onChange]);

  const columns = [
    col.accessor('projectName', {
      header: 'שם הפרויקט',
      cell: ({ row, getValue }) =>
        editingId === row.original.id
          ? <input className={editInput} value={editValues.projectName ?? ''} onChange={e => setEditValues(v => ({ ...v, projectName: e.target.value }))} />
          : <span className="font-medium text-slate-800">{getValue()}</span>,
    }),
    col.accessor('clientName', {
      header: 'לקוח',
      cell: ({ row, getValue }) =>
        editingId === row.original.id
          ? <input className={editInput} value={editValues.clientName ?? ''} onChange={e => setEditValues(v => ({ ...v, clientName: e.target.value }))} />
          : <span className="text-slate-600">{getValue()}</span>,
    }),
    col.accessor('status', {
      header: 'סטטוס',
      cell: ({ row, getValue }) =>
        editingId === row.original.id
          ? (
            <select
              className={editInput + ' cursor-pointer'}
              value={editValues.status ?? getValue()}
              onChange={e => setEditValues(v => ({ ...v, status: e.target.value as ProjectStatus }))}
            >
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )
          : <StatusBadge status={getValue()} />,
    }),
    col.accessor('startDate', {
      header: 'התחלה',
      cell: ({ row, getValue }) =>
        editingId === row.original.id
          ? <input type="date" className={editInput} value={editValues.startDate ?? ''} onChange={e => setEditValues(v => ({ ...v, startDate: e.target.value }))} />
          : <span className="text-slate-500 text-sm">{getValue()}</span>,
    }),
    col.accessor('endDate', {
      header: 'סיום משוער',
      cell: ({ row, getValue }) =>
        editingId === row.original.id
          ? <input type="date" className={editInput} value={editValues.endDate ?? ''} onChange={e => setEditValues(v => ({ ...v, endDate: e.target.value }))} />
          : <span className="text-slate-500 text-sm">{getValue()}</span>,
    }),
    col.accessor('budget', {
      header: 'תקציב',
      cell: ({ row, getValue }) =>
        editingId === row.original.id
          ? <input type="number" min="0" className={editInput} value={editValues.budget ?? 0} onChange={e => setEditValues(v => ({ ...v, budget: Number(e.target.value) }))} />
          : <span className="font-medium text-slate-700 tabular-nums">{formatCurrency(getValue())}</span>,
    }),
    col.accessor('notes', {
      header: 'הערות',
      enableSorting: false,
      cell: ({ row, getValue }) =>
        editingId === row.original.id
          ? <input className={editInput} value={editValues.notes ?? ''} onChange={e => setEditValues(v => ({ ...v, notes: e.target.value }))} />
          : <span className="text-slate-400 text-sm truncate max-w-48 block" title={getValue()}>{getValue() || '—'}</span>,
    }),
    col.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const isEditing = editingId === row.original.id;
        return (
          <div className="flex items-center gap-1 justify-end">
            {isEditing ? (
              <>
                <button onClick={saveEdit} title="שמור"
                  className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-50 transition-colors">
                  <CheckIcon className="w-4 h-4" />
                </button>
                <button onClick={cancelEdit} title="ביטול"
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => startEdit(row.original)} title="עריכה"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors">
                  <PencilSquareIcon className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteId(row.original.id)} title="מחיקה"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: projects,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  });

  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = table.getFilteredRowModel().rows.length;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">ניהול פרויקטים</h1>
          <p className="text-sm text-slate-500 mt-0.5">{totalRows} פרויקטים נמצאו</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm shadow-teal-600/20 transition-all hover:shadow-md hover:shadow-teal-600/25 active:scale-[0.98]"
        >
          <PlusIcon className="w-4 h-4" />
          הוספת פרויקט
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          placeholder="חיפוש בכל השדות..."
          className="w-full pr-9 pl-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white hover:border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-colors"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id} className="border-b border-slate-100 bg-slate-50/80">
                  {hg.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-right font-medium text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder ? null : (
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
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-16 text-center text-slate-400">
                    לא נמצאו פרויקטים
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={`border-b border-slate-50 transition-colors ${
                      editingId === row.original.id
                        ? 'bg-teal-50/40'
                        : i % 2 === 0 ? 'bg-white hover:bg-slate-50/60' : 'bg-slate-50/30 hover:bg-slate-50/60'
                    }`}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex-wrap gap-2">
          <span className="text-xs text-slate-500">
            מציג {pageIndex * pageSize + 1}–{Math.min((pageIndex + 1) * pageSize, totalRows)} מתוך {totalRows}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
            {Array.from({ length: table.getPageCount() }, (_, i) => (
              <button
                key={i}
                onClick={() => table.setPageIndex(i)}
                className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                  pageIndex === i
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {deleteId && (
        <ConfirmModal
          title="מחיקת פרויקט"
          message="האם אתה בטוח שברצונך למחוק פרויקט זה? לא ניתן לבטל פעולה זו."
          onConfirm={confirmDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {showAdd && (
        <AddProjectModal onAdd={addProject} onClose={() => setShowAdd(false)} />
      )}
    </div>
  );
}

const editInput = 'w-full px-2 py-1 text-sm border border-teal-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 min-w-24';
