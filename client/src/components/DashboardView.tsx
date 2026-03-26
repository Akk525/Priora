import { LayoutDashboard, TrendingUp, TrendingDown, CheckCircle2, Clock, AlertCircle, FolderPlus } from 'lucide-react';
import type { Board, Card, Column } from '../types';

export function DashboardView({
  boards,
  boardId,
  columns,
  cards,
  onSelectBoard,
  onNewBoard,
}: {
  boards: Board[];
  boardId: string;
  columns: Column[];
  cards: Card[];
  onSelectBoard: (id: string) => void;
  onNewBoard: () => void | Promise<void>;
}) {
  const active = cards.filter((c) => !c.archived);
  const total = active.length;
  const sortedCols = [...columns].sort((a, b) => a.position - b.position);
  const backlogId = sortedCols[0]?.id;
  const doneCol = columns.find((c) => /done/i.test(c.title));
  const completed = active.filter((c) => (doneCol && c.column_id === doneCol.id) || !!c.completed_at).length;
  const backlog = backlogId ? active.filter((c) => c.column_id === backlogId).length : 0;
  const inProgress = Math.max(0, total - completed - backlog);
  const overdue = active.filter((c) => c.due_date && new Date(c.due_date) < new Date()).length;
  const completionPct = total ? Math.round((completed / total) * 100) : 0;

  const byPriority: Record<string, number> = { urgent: 0, high: 0, medium: 0, low: 0 };
  for (const c of active) {
    byPriority[c.priority] = (byPriority[c.priority] || 0) + 1;
  }
  const maxPri = Math.max(1, ...Object.values(byPriority));

  const contributorMap = new Map<string, { name: string; total: number; done: number; active: number }>();
  for (const c of active) {
    const key = c.assignee_id || 'unassigned';
    const name = c.assignee_name || 'Unassigned';
    if (!contributorMap.has(key)) contributorMap.set(key, { name, total: 0, done: 0, active: 0 });
    const row = contributorMap.get(key)!;
    row.total += 1;
    if (doneCol && c.column_id === doneCol.id) row.done += 1;
    else row.active += 1;
  }
  const contributors = Array.from(contributorMap.values()).sort((a, b) => b.total - a.total).slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-600">Overview of cards and team activity on this board.</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 text-sm">
          <span className="rounded-md bg-white px-4 py-2 font-medium text-blue-600 shadow-sm">This board</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total tasks</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{total}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <LayoutDashboard className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-green-600">
            <TrendingUp className="mr-1 h-4 w-4" />
            <span className="font-medium">Active pipeline</span>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{completed}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{completionPct}% in Done column</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
              <div className="h-2 rounded-full bg-green-600 transition-all" style={{ width: `${completionPct}%` }} />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In progress</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{inProgress}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4 text-sm font-medium text-yellow-600">Middle columns (excl. backlog)</div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{overdue}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-red-600">
            <TrendingDown className="mr-1 h-4 w-4" />
            <span className="font-medium">Past due date</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Priority distribution</h3>
          <div className="space-y-4">
            {(['urgent', 'high', 'medium', 'low'] as const).map((p) => (
              <div key={p}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium capitalize text-gray-700">{p}</span>
                  <span className="text-sm font-semibold text-gray-900">{byPriority[p] ?? 0}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100">
                  <div
                    className={`h-2 rounded-full ${
                      p === 'urgent'
                        ? 'bg-red-500'
                        : p === 'high'
                          ? 'bg-orange-500'
                          : p === 'medium'
                            ? 'bg-blue-500'
                            : 'bg-green-500'
                    }`}
                    style={{ width: `${((byPriority[p] ?? 0) / maxPri) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Top contributors</h3>
          <div className="space-y-4">
            {contributors.length === 0 && <p className="text-sm text-gray-500">No assignees yet.</p>}
            {contributors.map((u) => {
              const pct = u.total ? Math.round((u.done / u.total) * 100) : 0;
              return (
                <div key={u.name} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                      {u.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-500">
                        {u.total} tasks · {u.done} done · {u.active} active
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Your boards</h3>
          </div>
          <button type="button" className="btn-primary gap-2" onClick={() => void onNewBoard()}>
            <FolderPlus className="h-4 w-4" />
            New board
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {boards.map((b) => {
            const isSel = b.id === boardId;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => onSelectBoard(b.id)}
                className={`rounded-lg border-2 p-4 text-left transition hover:shadow-md ${
                  isSel ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <h4 className="mb-1 font-semibold text-gray-900">{b.name}</h4>
                    <p className="line-clamp-2 text-sm text-gray-600">{b.description || 'No description'}</p>
                  </div>
                </div>
                {isSel && <p className="text-xs font-medium text-blue-600">Currently viewing</p>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
