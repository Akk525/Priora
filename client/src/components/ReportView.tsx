import { Filter, RefreshCw } from 'lucide-react';
import type { Category, Column, Member, ReportResponse } from '../types';

export function ReportView({
  columns,
  categories,
  members,
  report,
  filters,
  setFilters,
  runReport,
}: {
  columns: Column[];
  categories: Category[];
  members: Member[];
  report: ReportResponse | null;
  filters: Record<string, string>;
  setFilters: (next: Record<string, string>) => void;
  runReport: () => Promise<void>;
}) {
  const summary = report?.summary;
  const activeFilterCount = Object.entries(filters).filter(([k, v]) => v && !(k === 'archived' && v === 'false')).length;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Table report</h2>
        <p className="text-gray-600">Filters and assignees are loaded from PostgreSQL. Run the report after changing cards or filters.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <Filter className="h-4 w-4" />
          <span>{activeFilterCount ? `${activeFilterCount} filter(s) active` : 'No extra filters'}</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select
            className="input-control"
            value={filters.columnId || ''}
            onChange={(e) => setFilters({ ...filters, columnId: e.target.value })}
          >
            <option value="">All columns</option>
            {columns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <select
            className="input-control"
            value={filters.categoryId || ''}
            onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="input-control"
            value={filters.assigneeId || ''}
            onChange={(e) => setFilters({ ...filters, assigneeId: e.target.value })}
          >
            <option value="">All assignees</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.name}
              </option>
            ))}
          </select>
          <select
            className="input-control"
            value={filters.priority || ''}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
          >
            <option value="">Any priority</option>
            <option>low</option>
            <option>medium</option>
            <option>high</option>
            <option>urgent</option>
          </select>
          <select
            className="input-control"
            value={filters.archived || 'false'}
            onChange={(e) => setFilters({ ...filters, archived: e.target.value })}
          >
            <option value="false">Active</option>
            <option value="true">Archived</option>
          </select>
          <input
            type="date"
            className="input-control"
            value={filters.dueFrom || ''}
            onChange={(e) => setFilters({ ...filters, dueFrom: e.target.value })}
          />
          <input
            type="date"
            className="input-control"
            value={filters.dueTo || ''}
            onChange={(e) => setFilters({ ...filters, dueTo: e.target.value })}
          />
          <button type="button" className="btn-primary sm:col-span-2 lg:col-span-1" onClick={() => void runReport()}>
            <RefreshCw className="h-4 w-4" />
            Run report
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-gray-500">Total matching</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{summary.total}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-gray-500">Overdue</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{summary.overdue}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:col-span-2">
            <p className="text-xs font-medium uppercase text-gray-500">By priority</p>
            <p className="mt-1 text-sm text-gray-700">{Object.entries(summary.byPriority).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—'}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-4">
            <p className="text-xs font-medium uppercase text-gray-500">By column</p>
            <p className="mt-1 text-sm text-gray-700">{Object.entries(summary.byColumn).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—'}</p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-700">Title</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Column</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Priority</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Assignee</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Due</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Archived</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {report?.cards.length ? (
              report.cards.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.title}</td>
                  <td className="px-4 py-3 text-gray-600">{c.column_title}</td>
                  <td className="px-4 py-3 text-gray-600">{c.priority}</td>
                  <td className="px-4 py-3 text-gray-600">{c.assignee_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.due_date || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.archived ? 'Yes' : 'No'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Run the report or adjust filters. No matching rows yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
