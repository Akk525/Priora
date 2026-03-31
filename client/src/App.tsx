import { useCallback, useDeferredValue, useEffect, useMemo, useState, startTransition } from 'react';
import {
  Archive,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  FolderKanban,
  Funnel,
  GanttChartSquare,
  LayoutGrid,
  Mail,
  Palette,
  Plus,
  Search,
  Sparkles,
  Table2,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import { api } from './services/api';
import type { Board, BoardRole, Card, Category, Column, Invitation, Member, ReportResponse, User } from './types';
import { AuthView } from './components/AuthView';
import { CalendarView } from './components/CalendarView';
import { CategoryManager } from './components/CategoryManager';
import { DashboardView } from './components/DashboardView';
import { KanbanView } from './components/KanbanView';
import { MembersView } from './components/MembersView';
import { ReportView } from './components/ReportView';
import { TimelineView } from './components/TimelineView';

type MainTab = 'dashboard' | 'kanban' | 'table' | 'calendar' | 'gantt' | 'archive' | 'members';
type BoardDraft = { name: string; description: string; color: string };

const DEFAULT_BOARD_DRAFT: BoardDraft = {
  name: '',
  description: '',
  color: '#0f766e',
};

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = error.response as { data?: { error?: string } };
    return response?.data?.error || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardId, setBoardId] = useState('');
  const [columns, setColumns] = useState<Column[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [tab, setTab] = useState<MainTab>('dashboard');
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [reportFilters, setReportFilters] = useState<Record<string, string>>({ archived: 'false' });
  const [showCategories, setShowCategories] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [kanbanSearch, setKanbanSearch] = useState('');
  const [kanbanPriority, setKanbanPriority] = useState<string | null>(null);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [appError, setAppError] = useState('');
  const [notice, setNotice] = useState('');
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isBoardLoading, setIsBoardLoading] = useState(false);
  const [isAuthPending, setIsAuthPending] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [boardComposerOpen, setBoardComposerOpen] = useState(false);
  const [boardDraft, setBoardDraft] = useState<BoardDraft>(DEFAULT_BOARD_DRAFT);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [autoSeededBoardId, setAutoSeededBoardId] = useState('');

  const deferredSearch = useDeferredValue(kanbanSearch);

  const selectedBoard = useMemo(() => boards.find((board) => board.id === boardId), [boards, boardId]);
  const canManageBoard = selectedBoard?.role === 'owner' || selectedBoard?.role === 'admin';
  const canContribute = selectedBoard?.role === 'owner' || selectedBoard?.role === 'admin' || selectedBoard?.role === 'member';
  const activeCards = useMemo(() => cards.filter((card) => !card.archived), [cards]);
  const archivedCards = useMemo(() => cards.filter((card) => card.archived), [cards]);
  const recentArchivedCards = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return archivedCards
      .filter((card) => {
        if (!card.archived_at) return false;
        return new Date(card.archived_at).getTime() >= weekAgo;
      })
      .sort((left, right) => {
        const leftTime = left.archived_at ? new Date(left.archived_at).getTime() : 0;
        const rightTime = right.archived_at ? new Date(right.archived_at).getTime() : 0;
        return rightTime - leftTime;
      });
  }, [archivedCards]);
  const overdueCards = useMemo(
    () => activeCards.filter((card) => card.due_date && new Date(card.due_date) < new Date()).length,
    [activeCards],
  );
  const completionRate = useMemo(() => {
    const doneColumn = columns.find((column) => /done/i.test(column.title));
    if (!activeCards.length) return 0;
    const completed = activeCards.filter((card) => card.completed_at || (doneColumn && card.column_id === doneColumn.id)).length;
    return Math.round((completed / activeCards.length) * 100);
  }, [activeCards, columns]);

  function clearBoardState() {
    startTransition(() => {
      setColumns([]);
      setCategories([]);
      setCards([]);
      setMembers([]);
      setReport(null);
    });
  }

  const loadInvitations = useCallback(async () => {
    const { data } = await api.get('/invitations/me');
    startTransition(() => setInvites(data.invitations));
  }, []);

  const loadBoards = useCallback(async (preferredBoardId?: string, currentBoardId?: string) => {
    const { data } = await api.get('/boards');
    const nextBoards = data.boards as Board[];
    const existingSelected = currentBoardId && nextBoards.some((board) => board.id === currentBoardId) ? currentBoardId : '';
    const preferred = preferredBoardId && nextBoards.some((board) => board.id === preferredBoardId) ? preferredBoardId : '';
    const nextBoardId = preferred || existingSelected || nextBoards[0]?.id || '';

    startTransition(() => {
      setBoards(nextBoards);
      setBoardId(nextBoardId);
    });

    return nextBoardId;
  }, []);

  const runReport = useCallback(async (targetBoardId = boardId, filters = reportFilters) => {
    if (!targetBoardId) {
      setReport(null);
      return;
    }

    const query = new URLSearchParams({
      boardId: targetBoardId,
      ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
    });

    const { data } = await api.get(`/reports/cards?${query.toString()}`);
    startTransition(() => setReport(data));
  }, [boardId, reportFilters]);

  const loadBoardData = useCallback(async (targetBoardId?: string) => {
    if (!targetBoardId) {
      startTransition(() => {
        setColumns([]);
        setCategories([]);
        setCards([]);
        setMembers([]);
        setReport(null);
      });
      return;
    }

    setIsBoardLoading(true);
    try {
      const [columnsRes, categoriesRes, cardsRes, membersRes] = await Promise.all([
        api.get(`/boards/${targetBoardId}/columns`),
        api.get(`/boards/${targetBoardId}/categories`),
        api.get(`/boards/${targetBoardId}/cards`),
        api.get(`/boards/${targetBoardId}/members`),
      ]);

      startTransition(() => {
        setColumns(columnsRes.data.columns);
        setCategories(categoriesRes.data.categories);
        setCards(cardsRes.data.cards);
        setMembers(membersRes.data.members);
      });
    } catch (error) {
      setAppError(getErrorMessage(error, 'Unable to load board data.'));
    } finally {
      setIsBoardLoading(false);
    }
  }, []);

  const refreshWorkspace = useCallback(async (preferredBoardId?: string, includeReport?: boolean, currentBoardId?: string) => {
    const nextBoardId = await loadBoards(preferredBoardId, currentBoardId);
    await loadInvitations();
    if (nextBoardId) {
      await loadBoardData(nextBoardId);
      if (includeReport) {
        await runReport(nextBoardId);
      }
    } else {
      clearBoardState();
    }
    return nextBoardId;
  }, [loadBoardData, loadBoards, loadInvitations, runReport]);

  useEffect(() => {
    void (async () => {
      setIsBootstrapping(true);
      try {
        const { data } = await api.get('/auth/me');
        startTransition(() => setUser(data.user));
      } catch {
        startTransition(() => setUser(null));
      } finally {
        setIsBootstrapping(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!user) {
      setBoards([]);
      setBoardId('');
      setInvites([]);
      startTransition(() => {
        setColumns([]);
        setCategories([]);
        setCards([]);
        setMembers([]);
        setReport(null);
      });
      return;
    }

    void (async () => {
      const nextBoardId = await loadBoards();
      await loadInvitations();
      if (nextBoardId) {
        await loadBoardData(nextBoardId);
      }
    })();
  }, [loadBoardData, loadBoards, loadInvitations, user]);

  useEffect(() => {
    if (!user || !boardId) return;
    void loadBoardData(boardId);
  }, [boardId, loadBoardData, user]);

  useEffect(() => {
    if (!user || !boardId || tab !== 'table') return;
    void runReport(boardId);
  }, [boardId, runReport, tab, user]);



  async function performAction(
    action: () => Promise<void>,
    {
      successMessage,
      fallbackMessage,
      refresh = 'board',
      preferredBoardId,
      includeReport,
    }: {
      successMessage: string;
      fallbackMessage: string;
      refresh?: 'board' | 'workspace' | 'none';
      preferredBoardId?: string;
      includeReport?: boolean;
    },
  ) {
    setIsMutating(true);
    setAppError('');
    setNotice('');

    try {
      await action();

      if (refresh === 'workspace') {
        await refreshWorkspace(preferredBoardId, includeReport, boardId);
      } else if (refresh === 'board') {
        await loadBoardData(preferredBoardId || boardId);
        if (includeReport) {
          await runReport(preferredBoardId || boardId);
        }
      }

      setNotice(successMessage);
    } catch (error) {
      setAppError(getErrorMessage(error, fallbackMessage));
      throw error;
    } finally {
      setIsMutating(false);
    }
  }

  async function login(email: string, password: string) {
    setIsAuthPending(true);
    setAppError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      startTransition(() => setUser(data.user));
    } finally {
      setIsAuthPending(false);
    }
  }

  async function register(name: string, email: string, password: string) {
    setIsAuthPending(true);
    setAppError('');
    try {
      await api.post('/auth/register', { name, email, password });
      await login(email, password);
    } finally {
      setIsAuthPending(false);
    }
  }

  async function logout() {
    await performAction(
      async () => {
        await api.post('/auth/logout');
        startTransition(() => {
          setUser(null);
          setUserMenuOpen(false);
          setTab('dashboard');
        });
      },
      { successMessage: 'Logged out.', fallbackMessage: 'Unable to log out.', refresh: 'none' },
    );
  }

  async function createCard(payload: Record<string, unknown>) {
    await performAction(
      async () => {
        await api.post(`/boards/${boardId}/cards`, {
          ...payload,
          columnId: payload.columnId || columns[0]?.id,
          position: 1,
          archived: false,
        });
      },
      { successMessage: 'Card created.', fallbackMessage: 'Unable to create card.', includeReport: tab === 'table' },
    );
  }

  async function editCard(cardId: string, payload: Record<string, unknown>) {
    await performAction(
      async () => {
        await api.patch(`/boards/${boardId}/cards/${cardId}`, {
          ...payload,
          categoryId: payload.categoryId || null,
          assigneeId: payload.assigneeId || null,
        });
      },
      { successMessage: 'Card updated.', fallbackMessage: 'Unable to save card.', includeReport: tab === 'table' },
    );
    setEditingCard(null);
  }

  async function applyCardOrder(nextByColumn: Record<string, string[]>) {
    const targetBoardId = boardId;
    if (!targetBoardId) return;

    const updates: { cardId: string; columnId: string; position: number }[] = [];
    for (const [columnId, ids] of Object.entries(nextByColumn)) {
      ids.forEach((cardId, index) => updates.push({ cardId, columnId, position: index + 1 }));
    }

    await performAction(
      async () => {
        await Promise.all(
          updates.map(({ cardId, columnId, position }) =>
            api.patch(`/boards/${targetBoardId}/cards/${cardId}`, { columnId, position }),
          ),
        );
      },
      {
        successMessage: 'Card order updated.',
        fallbackMessage: 'Unable to reorder cards.',
        includeReport: tab === 'table',
      },
    );
  }

  async function archiveCard(cardId: string) {
    await performAction(
      async () => {
        await api.post(`/boards/${boardId}/cards/${cardId}/archive`);
      },
      { successMessage: 'Card archived.', fallbackMessage: 'Unable to archive card.', includeReport: tab === 'table' },
    );
  }

  async function restoreCard(cardId: string) {
    await performAction(
      async () => {
        await api.post(`/boards/${boardId}/cards/${cardId}/restore`);
      },
      { successMessage: 'Card restored.', fallbackMessage: 'Unable to restore card.', includeReport: tab === 'table' },
    );
  }

  async function createCategory(name: string, color: string) {
    if (!name.trim()) return;
    await performAction(
      async () => {
        await api.post(`/boards/${boardId}/categories`, { name, color });
      },
      { successMessage: 'Category created.', fallbackMessage: 'Unable to create category.' },
    );
  }

  async function updateCategory(categoryId: string, name: string, color: string) {
    await performAction(
      async () => {
        await api.patch(`/boards/${boardId}/categories/${categoryId}`, { name, color });
      },
      { successMessage: 'Category updated.', fallbackMessage: 'Unable to update category.' },
    );
  }

  async function deleteCategory(categoryId: string) {
    await performAction(
      async () => {
        await api.delete(`/boards/${boardId}/categories/${categoryId}`);
      },
      { successMessage: 'Category deleted.', fallbackMessage: 'Unable to delete category.' },
    );
  }

  async function sendInvite(email: string, role: BoardRole) {
    await performAction(
      async () => {
        await api.post(`/boards/${boardId}/invitations`, { email, role });
        await loadInvitations();
      },
      { successMessage: 'Invitation sent.', fallbackMessage: 'Unable to send invitation.', refresh: 'board' },
    );
  }

  async function acceptInvite(id: string) {
    await performAction(
      async () => {
        await api.post(`/invitations/${id}/accept`);
      },
      {
        successMessage: 'Invitation accepted.',
        fallbackMessage: 'Unable to accept invitation.',
        refresh: 'workspace',
        preferredBoardId: boardId,
        includeReport: tab === 'table',
      },
    );
  }

  async function rejectInvite(id: string) {
    await performAction(
      async () => {
        await api.post(`/invitations/${id}/reject`);
        await loadInvitations();
      },
      { successMessage: 'Invitation rejected.', fallbackMessage: 'Unable to reject invitation.', refresh: 'none' },
    );
  }

  async function updateRole(userId: string, role: BoardRole) {
    await performAction(
      async () => {
        await api.patch(`/boards/${boardId}/members/${userId}`, { role });
      },
      { successMessage: 'Member role updated.', fallbackMessage: 'Unable to update role.' },
    );
  }

  async function createBoard() {
    if (!boardDraft.name.trim()) {
      setAppError('Board name is required.');
      return;
    }

    await performAction(
      async () => {
        const { data } = await api.post('/boards', {
          name: boardDraft.name.trim(),
          description: boardDraft.description.trim() || null,
          color: boardDraft.color,
        });
        setBoardComposerOpen(false);
        setBoardDraft(DEFAULT_BOARD_DRAFT);
        startTransition(() => {
          setBoardId(data.board.id);
          setTab('kanban');
        });
        await refreshWorkspace(data.board.id, false, data.board.id);
      },
      {
        successMessage: 'Board created.',
        fallbackMessage: 'Unable to create board.',
        refresh: 'none',
      },
    );
  }

  async function seedDefaultColumns() {
    await performAction(
      async () => {
        await api.post(`/boards/${boardId}/columns/defaults`);
      },
      { successMessage: 'Default columns added.', fallbackMessage: 'Unable to add default columns.' },
    );
  }

  const tabButton = (id: MainTab, label: string, Icon: typeof LayoutGrid) => (
    <button
      type="button"
      key={id}
      onClick={() => setTab(id)}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition ${
        tab === id
          ? 'bg-slate-950 text-white shadow-lg shadow-slate-900/20'
          : 'text-slate-600 hover:bg-white hover:text-slate-950'
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden />
      <span>{label}</span>
    </button>
  );

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.15),_transparent_40%),linear-gradient(180deg,_#f8fafc_0%,_#e2e8f0_100%)]">
        <div className="rounded-[28px] border border-white/70 bg-white/80 px-8 py-6 shadow-[0_32px_80px_-48px_rgba(15,23,42,0.6)] backdrop-blur">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Priora</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">Loading workspace</h1>
        </div>
      </div>
    );
  }

  if (!user) return <AuthView onLogin={login} onRegister={register} isLoading={isAuthPending} />;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(20,184,166,0.14),_transparent_24%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] text-slate-900">
      {boardComposerOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[32px] border border-white/80 bg-white p-8 shadow-[0_36px_90px_-50px_rgba(15,23,42,0.55)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Create Board</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">Start a new workspace</h2>
              </div>
              <button type="button" className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" onClick={() => setBoardComposerOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 grid gap-4">
              <input
                className="input-control"
                placeholder="Board name"
                value={boardDraft.name}
                onChange={(event) => setBoardDraft((draft) => ({ ...draft, name: event.target.value }))}
              />
              <textarea
                className="input-control min-h-28 resize-none"
                placeholder="What is this board for?"
                value={boardDraft.description}
                onChange={(event) => setBoardDraft((draft) => ({ ...draft, description: event.target.value }))}
              />
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="color"
                  className="h-12 w-16 cursor-pointer rounded-xl border border-slate-200 bg-transparent"
                  value={boardDraft.color}
                  onChange={(event) => setBoardDraft((draft) => ({ ...draft, color: event.target.value }))}
                />
                <div>
                  <p className="text-sm font-medium text-slate-900">Accent color</p>
                  <p className="text-sm text-slate-500">Used in the board switcher and overview cards.</p>
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setBoardComposerOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={() => void createBoard()} disabled={isMutating}>
                <Plus className="h-4 w-4" />
                Create board
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="border-b border-white/60 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">
                <Sparkles className="h-3.5 w-3.5" />
                Execution Workspace
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Priora</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Operate the board, reports, schedule, and membership flows from one place with live PostgreSQL-backed data.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricPill icon={FolderKanban} label="Boards" value={boards.length} />
                <MetricPill icon={CheckCircle2} label="Completion" value={`${completionRate}%`} />
                <MetricPill icon={CircleAlert} label="Overdue" value={overdueCards} />
                <MetricPill icon={Mail} label="Invites" value={invites.length} />
              </div>
            </div>

            <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end xl:w-auto">
              <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => setBoardComposerOpen(true)}>
                <Plus className="h-4 w-4" />
                New board
              </button>
              <div className="relative sm:self-end">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((open) => !open)}
                  className="inline-flex w-full items-center justify-between gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:border-slate-300 sm:w-auto"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-white">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <div className="hidden text-left sm:block">
                    <p className="text-sm font-medium text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-500 transition ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-56 rounded-3xl border border-slate-200 bg-white p-2 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.4)]">
                    <button type="button" className="w-full rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50" onClick={() => void logout()}>
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {(appError || notice) && (
            <div className="space-y-3">
              {appError && (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                  <span className="font-semibold">Issue:</span> {appError}
                </div>
              )}
              {notice && (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
                  <span className="font-semibold">Updated:</span> {notice}
                </div>
              )}
            </div>
          )}

          <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-[0_36px_90px_-56px_rgba(15,23,42,0.55)] backdrop-blur">
            <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)] 2xl:items-start">
              <div className="space-y-4">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] xl:items-start">
                  <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Active board</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <div className="relative min-w-0 flex-1">
                      <span
                        className="pointer-events-none absolute left-4 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full"
                        style={{ backgroundColor: selectedBoard?.color || '#0f172a' }}
                      />
                      <select
                        className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                        value={boardId}
                        onChange={(event) => setBoardId(event.target.value)}
                        aria-label="Select board"
                      >
                        {boards.map((board) => (
                          <option key={board.id} value={board.id}>
                            {board.name} ({board.role})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    </div>
                    {selectedBoard && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                        {selectedBoard.role}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-slate-500">
                    {selectedBoard?.description || 'No board description yet. Cards, reports, and member activity will load here.'}
                  </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <MiniStat label="Active" value={activeCards.length} />
                    <MiniStat label="Archive" value={recentArchivedCards.length} />
                    <MiniStat label="Members" value={members.length} />
                    <MiniStat label="Categories" value={categories.length} />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_repeat(4,max-content)] 2xl:grid-cols-2">
                <div className="relative min-w-0 sm:col-span-2 xl:col-span-1 2xl:col-span-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    placeholder="Search cards"
                    className="input-control rounded-2xl bg-slate-50 pl-10"
                    value={kanbanSearch}
                    onChange={(event) => setKanbanSearch(event.target.value)}
                  />
                </div>
                <div className="relative">
                  <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => setFilterMenuOpen((open) => !open)}>
                    <Funnel className="h-4 w-4" />
                    Priority
                    {kanbanPriority && <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[11px] font-semibold text-cyan-800">{kanbanPriority}</span>}
                  </button>
                  {filterMenuOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-44 rounded-3xl border border-slate-200 bg-white p-2 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.4)]">
                      <button
                        type="button"
                        className="block w-full rounded-2xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                        onClick={() => {
                          setKanbanPriority(null);
                          setFilterMenuOpen(false);
                        }}
                      >
                        All priorities
                      </button>
                      {(['urgent', 'high', 'medium', 'low'] as const).map((priority) => (
                        <button
                          key={priority}
                          type="button"
                          className="block w-full rounded-2xl px-3 py-2 text-left text-sm capitalize text-slate-700 transition hover:bg-slate-50"
                          onClick={() => {
                            setKanbanPriority(priority);
                            setFilterMenuOpen(false);
                          }}
                        >
                          {priority}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => setTab('archive')}>
                  <Archive className="h-4 w-4" />
                  Archive
                </button>
                {canManageBoard && (
                  <button
                    type="button"
                    className={`btn-secondary w-full sm:w-auto ${showCategories && tab === 'kanban' ? 'border-cyan-300 bg-cyan-50 text-cyan-800' : ''}`}
                    onClick={() => {
                      setTab('kanban');
                      setShowCategories((open) => !open);
                    }}
                  >
                    <Palette className="h-4 w-4" />
                    Categories
                  </button>
                )}
                <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => setTab('members')}>
                  <Users className="h-4 w-4" />
                  Team
                </button>
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-2 rounded-[28px] border border-white/70 bg-white/80 p-2 shadow-[0_24px_56px_-50px_rgba(15,23,42,0.45)] backdrop-blur">
            {tabButton('dashboard', 'Dashboard', BarChart3)}
            {tabButton('kanban', 'Kanban', LayoutGrid)}
            {tabButton('table', 'Report', Table2)}
            {tabButton('calendar', 'Calendar', Calendar)}
            {tabButton('gantt', 'Timeline', GanttChartSquare)}
            {tabButton('members', 'Members', Users)}
          </div>

          {boards.length === 0 ? (
            <section className="rounded-[32px] border border-dashed border-slate-300 bg-white/80 px-8 py-16 text-center shadow-[0_24px_60px_-48px_rgba(15,23,42,0.45)]">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">No boards yet</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-950">Create the first workspace</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600">
                Priora is ready, but there is no board to load. Create one now and default columns will be provisioned automatically.
              </p>
              <button type="button" className="btn-primary mt-8" onClick={() => setBoardComposerOpen(true)}>
                <Plus className="h-4 w-4" />
                Create board
              </button>
            </section>
          ) : (
            <>
              {isBoardLoading && (
                <div className="rounded-3xl border border-cyan-200 bg-cyan-50 px-5 py-4 text-sm text-cyan-700">
                  Loading latest board data from the backend.
                </div>
              )}

              {tab === 'dashboard' && (
                <DashboardView boards={boards} boardId={boardId} columns={columns} cards={cards} onSelectBoard={setBoardId} onNewBoard={() => setBoardComposerOpen(true)} />
              )}

              {tab === 'kanban' && (
                <div className="space-y-6">
                  {showCategories && canManageBoard && (
                    <CategoryManager categories={categories} onCreate={createCategory} onUpdate={updateCategory} onDelete={deleteCategory} />
                  )}
                  <KanbanView
                    columns={columns}
                    categories={categories}
                    members={members}
                    cards={cards}
                    searchQuery={deferredSearch}
                    priorityFilter={kanbanPriority}
                    onCreate={createCard}
                    onEdit={editCard}
                    onDelete={archiveCard}
                    onApplyCardOrder={applyCardOrder}
                    canSeedDefaultColumns={!!canManageBoard}
                    onSeedDefaultColumns={seedDefaultColumns}
                  />
                </div>
              )}

              {tab === 'table' && (
                <ReportView
                  columns={columns}
                  categories={categories}
                  members={members}
                  report={report}
                  filters={reportFilters}
                  setFilters={setReportFilters}
                  runReport={() => runReport(boardId)}
                />
              )}

              {tab === 'calendar' && <CalendarView cards={cards} columns={columns} onOpenCard={setEditingCard} />}

              {tab === 'gantt' && <TimelineView cards={cards} onOpenCard={setEditingCard} />}

              {tab === 'archive' && (
                <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_36px_90px_-56px_rgba(15,23,42,0.55)] backdrop-blur">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Archive</p>
                      <h2 className="mt-2 text-3xl font-semibold text-slate-950">Task graveyard</h2>
                      <p className="mt-2 text-sm text-slate-600">Archived cards from the last 7 days. Restore anything that should go back into the workflow.</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      {recentArchivedCards.length} archived item{recentArchivedCards.length === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {recentArchivedCards.length === 0 && (
                      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                        Nothing has been archived in the last week.
                      </div>
                    )}
                    {recentArchivedCards.map((card) => (
                      <article key={card.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">{card.title}</h3>
                            <p className="mt-1 text-sm text-slate-500">{card.category_name || 'No category'} · {card.priority}</p>
                            {card.archived_at && <p className="mt-2 text-xs text-slate-400">Archived {new Date(card.archived_at).toLocaleString()}</p>}
                          </div>
                          <button type="button" className="btn-primary !rounded-full !px-3 !py-2" onClick={() => void restoreCard(card.id)}>
                            Restore
                          </button>
                        </div>
                        {card.description && <p className="mt-4 text-sm text-slate-600">{card.description}</p>}
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {tab === 'members' && (
                <MembersView
                  members={members}
                  invitations={invites}
                  canManage={!!canManageBoard}
                  onInvite={sendInvite}
                  onAccept={acceptInvite}
                  onReject={rejectInvite}
                  onRoleChange={updateRole}
                />
              )}
            </>
          )}
        </div>
      </main>

      {editingCard && (
        <EditCardModal
          card={editingCard}
          columns={columns}
          categories={categories}
          members={members}
          onClose={() => setEditingCard(null)}
          onSave={(payload) => editCard(editingCard.id, payload)}
          canEdit={canContribute}
          isSaving={isMutating}
        />
      )}
    </div>
  );
}

function MetricPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FolderKanban;
  label: string;
  value: string | number;
}) {
  return (
    <div className="inline-flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function EditCardModal({
  card,
  columns,
  categories,
  members,
  onClose,
  onSave,
  canEdit,
  isSaving,
}: {
  card: Card;
  columns: Column[];
  categories: Category[];
  members: Member[];
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
  canEdit: boolean | undefined;
  isSaving: boolean;
}) {
  const [form, setForm] = useState({
    title: card.title,
    description: card.description || '',
    columnId: card.column_id,
    categoryId: card.category_id || '',
    assigneeId: card.assignee_id || '',
    priority: card.priority,
    startDate: card.start_date || '',
    dueDate: card.due_date || '',
  });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[32px] border border-white/80 bg-white p-8 shadow-[0_36px_90px_-50px_rgba(15,23,42,0.55)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Card</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">{canEdit ? 'Update task' : 'Task details'}</h3>
          </div>
          <button type="button" className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input
            className="input-control sm:col-span-2"
            placeholder="Title"
            value={form.title}
            disabled={!canEdit}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          />
          <textarea
            className="input-control min-h-28 resize-none sm:col-span-2"
            placeholder="Description"
            value={form.description}
            disabled={!canEdit}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
          <select
            className="input-control"
            value={form.columnId}
            disabled={!canEdit}
            onChange={(event) => setForm((current) => ({ ...current, columnId: event.target.value }))}
          >
            {columns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.title}
              </option>
            ))}
          </select>
          <select
            className="input-control"
            value={form.priority}
            disabled={!canEdit}
            onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as Card['priority'] }))}
          >
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="urgent">urgent</option>
          </select>
          <select
            className="input-control"
            value={form.categoryId}
            disabled={!canEdit}
            onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            className="input-control"
            value={form.assigneeId}
            disabled={!canEdit}
            onChange={(event) => setForm((current) => ({ ...current, assigneeId: event.target.value }))}
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="input-control"
            value={form.startDate}
            disabled={!canEdit}
            onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
          />
          <input
            type="date"
            className="input-control"
            value={form.dueDate}
            disabled={!canEdit}
            onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
          />
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
          {canEdit && (
            <button
              type="button"
              className="btn-primary"
              disabled={isSaving}
              onClick={() =>
                void onSave({
                  title: form.title,
                  description: form.description,
                  columnId: form.columnId,
                  categoryId: form.categoryId || null,
                  assigneeId: form.assigneeId || null,
                  priority: form.priority,
                  startDate: form.startDate || null,
                  dueDate: form.dueDate || null,
                })
              }
            >
              Save changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
