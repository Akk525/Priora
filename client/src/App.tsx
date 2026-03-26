import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  BarChart3,
  Calendar,
  ChevronDown,
  Funnel,
  GanttChart,
  LayoutGrid,
  Mail,
  Palette,
  Search,
  Table2,
  User as UserIcon,
  Users,
} from 'lucide-react';
import { api } from './services/api';
import type { Board, BoardRole, Card, Category, Column, Invitation, Member, ReportResponse, User } from './types';
import { AuthView } from './components/AuthView';
import { KanbanView } from './components/KanbanView';
import { ReportView } from './components/ReportView';
import { MembersView } from './components/MembersView';
import { CategoryManager } from './components/CategoryManager';
import { DashboardView } from './components/DashboardView';

type MainTab = 'dashboard' | 'kanban' | 'table' | 'calendar' | 'gantt' | 'archive' | 'members';

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

  const selectedBoard = useMemo(() => boards.find((b) => b.id === boardId), [boards, boardId]);
  const canManageBoard = selectedBoard?.role === 'owner' || selectedBoard?.role === 'admin';

  async function loadMe() {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }
  async function loadBoards() {
    const { data } = await api.get('/boards');
    setBoards(data.boards);
    if (!boardId && data.boards[0]) setBoardId(data.boards[0].id);
  }
  async function loadBoardData(bid = boardId) {
    if (!bid) return;
    const [colRes, catRes, cardRes, memRes, invRes] = await Promise.all([
      api.get(`/boards/${bid}/columns`),
      api.get(`/boards/${bid}/categories`),
      api.get(`/boards/${bid}/cards`),
      api.get(`/boards/${bid}/members`),
      api.get('/invitations/me'),
    ]);
    setColumns(colRes.data.columns);
    setCategories(catRes.data.categories);
    setCards(cardRes.data.cards);
    setMembers(memRes.data.members);
    setInvites(invRes.data.invitations);
  }

  async function refreshAll() {
    await loadBoards();
    await loadBoardData();
    if (tab === 'table') await runReport();
  }

  useEffect(() => {
    loadMe();
  }, []);
  useEffect(() => {
    if (user) loadBoards();
  }, [user]);
  useEffect(() => {
    if (boardId) loadBoardData(boardId);
  }, [boardId]);

  useEffect(() => {
    if (tab === 'table' && boardId) void runReport();
  }, [tab, boardId]);

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    setUser(data.user);
  }
  async function register(name: string, email: string, password: string) {
    await api.post('/auth/register', { name, email, password });
    await login(email, password);
  }
  async function logout() {
    await api.post('/auth/logout');
    setUser(null);
    setBoards([]);
    setUserMenuOpen(false);
  }

  async function createCard(payload: Record<string, unknown>) {
    await api.post(`/boards/${boardId}/cards`, {
      ...payload,
      columnId: payload.columnId || columns[0]?.id,
      position: 1,
      archived: false,
    });
    await refreshAll();
  }
  async function editCard(cardId: string, payload: Record<string, unknown>) {
    await api.patch(`/boards/${boardId}/cards/${cardId}`, {
      ...payload,
      categoryId: payload.categoryId || null,
      assigneeId: payload.assigneeId || null,
    });
    await refreshAll();
  }
  /** Apply full column ordering after drag-and-drop (batched PATCH + single refresh). */
  async function applyCardOrder(nextByColumn: Record<string, string[]>) {
    const bid = boardId;
    if (!bid) return;
    const updates: { cardId: string; columnId: string; position: number }[] = [];
    for (const [columnId, ids] of Object.entries(nextByColumn)) {
      ids.forEach((cardId, index) => updates.push({ cardId, columnId, position: index + 1 }));
    }
    await Promise.all(
      updates.map(({ cardId, columnId, position }) =>
        api.patch(`/boards/${bid}/cards/${cardId}`, { columnId, position }),
      ),
    );
    await loadBoardData(bid);
  }
  async function deleteCard(cardId: string) {
    await api.delete(`/boards/${boardId}/cards/${cardId}`);
    await refreshAll();
  }
  async function restoreCard(cardId: string) {
    await api.post(`/boards/${boardId}/cards/${cardId}/restore`);
    await refreshAll();
  }

  async function createCategory(name: string, color: string) {
    if (!name.trim()) return;
    await api.post(`/boards/${boardId}/categories`, { name, color });
    await loadBoardData();
  }
  async function updateCategory(categoryId: string, name: string, color: string) {
    await api.patch(`/boards/${boardId}/categories/${categoryId}`, { name, color });
    await loadBoardData();
  }
  async function deleteCategory(categoryId: string) {
    await api.delete(`/boards/${boardId}/categories/${categoryId}`);
    await loadBoardData();
  }

  async function sendInvite(email: string, role: BoardRole) {
    await api.post(`/boards/${boardId}/invitations`, { email, role });
    await loadBoardData();
  }
  async function acceptInvite(id: string) {
    await api.post(`/invitations/${id}/accept`);
    await refreshAll();
  }
  async function rejectInvite(id: string) {
    await api.post(`/invitations/${id}/reject`);
    await refreshAll();
  }
  async function updateRole(userId: string, role: BoardRole) {
    await api.patch(`/boards/${boardId}/members/${userId}`, { role });
    await loadBoardData();
  }

  async function runReport() {
    const query = new URLSearchParams({
      boardId,
      ...Object.fromEntries(Object.entries(reportFilters).filter(([, v]) => v)),
    });
    const { data } = await api.get(`/reports/cards?${query.toString()}`);
    setReport(data);
  }

  async function createBoard() {
    await api.post('/boards', { name: `Board ${Date.now()}` });
    await loadBoards();
  }

  async function seedDefaultColumns() {
    if (!boardId) return;
    await api.post(`/boards/${boardId}/columns/defaults`);
    await loadBoardData(boardId);
  }

  if (!user) return <AuthView onLogin={login} onRegister={register} />;

  const tabButton = (id: MainTab, label: string, Icon: typeof LayoutGrid) => (
    <button
      type="button"
      key={id}
      onClick={() => setTab(id)}
      className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
        tab === id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex min-h-screen animate-fadeIn flex-col bg-gray-50">
      <nav className="border-b border-blue-800 bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">Priora</h1>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white transition hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                <UserIcon className="h-5 w-5 text-blue-600" aria-hidden />
              </div>
              <span className="hidden font-medium sm:block">{user.name}</span>
              <ChevronDown className={`h-4 w-4 transition ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <p className="border-b border-gray-100 px-3 py-2 text-xs text-gray-500">{user.email}</p>
                <button type="button" className="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50" onClick={logout}>
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <p className="text-lg font-medium text-gray-800">Wassup {user.name}? Let&apos;s ship.</p>
        </div>
      </div>

      <div className="border-b border-gray-200 bg-white py-3 shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex min-w-[220px] items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 shadow-sm transition hover:bg-gray-50">
              {selectedBoard && (
                <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: selectedBoard.color || '#3b82f6' }} />
              )}
              <select
                className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent text-sm font-semibold text-gray-900 focus:ring-0"
                value={boardId}
                onChange={(e) => setBoardId(e.target.value)}
                aria-label="Select board"
              >
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.role})
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none h-4 w-4 flex-shrink-0 text-gray-500" />
            </div>
            {selectedBoard && (
              <div>
                <p className="text-xs text-gray-600">{selectedBoard.description || "Track your team's sprint progress"}</p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                placeholder="Search..."
                className="w-48 rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                value={kanbanSearch}
                onChange={(e) => setKanbanSearch(e.target.value)}
              />
            </div>
            <div className="relative">
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => setFilterMenuOpen((o) => !o)}
              >
                <Funnel className="h-3.5 w-3.5" />
                Filter
                {kanbanPriority && <span className="ml-1 rounded bg-blue-100 px-1 text-blue-800">{kanbanPriority}</span>}
              </button>
              {filterMenuOpen && (
                <div className="absolute right-0 z-50 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    onClick={() => {
                      setKanbanPriority(null);
                      setFilterMenuOpen(false);
                    }}
                  >
                    All priorities
                  </button>
                  {(['urgent', 'high', 'medium', 'low'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm capitalize hover:bg-gray-50"
                      onClick={() => {
                        setKanbanPriority(p);
                        setFilterMenuOpen(false);
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" className="btn-secondary text-xs" onClick={() => setTab('archive')}>
              <Archive className="h-3.5 w-3.5" />
              Archive
            </button>
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => {
                setTab('kanban');
                setShowCategories((s) => !s);
              }}
            >
              <Palette className="h-3.5 w-3.5" />
              Categories
            </button>
            <button type="button" className="btn-secondary text-xs" onClick={() => setTab('members')}>
              <Users className="h-3.5 w-3.5" />
              Members
              <span className="text-gray-500">({members.length})</span>
            </button>
            <button type="button" className="btn-secondary text-xs" onClick={() => setTab('members')}>
              <Mail className="h-3.5 w-3.5" />
              Invites
              {invites.length > 0 && <span className="ml-1 rounded-full bg-amber-100 px-1.5 text-amber-800">{invites.length}</span>}
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 bg-white py-3">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-gray-100 p-1">
            {tabButton('dashboard', 'Dashboard', BarChart3)}
            {tabButton('kanban', 'Kanban', LayoutGrid)}
            {tabButton('table', 'Table', Table2)}
            {tabButton('calendar', 'Calendar', Calendar)}
            {tabButton('gantt', 'Gantt', GanttChart)}
          </div>
        </div>
      </div>

      <main className={tab === 'kanban' ? 'flex-1 p-4' : 'flex-1 px-6 py-12'}>
        <div className={tab === 'kanban' ? 'view-transition-enter mx-auto max-w-7xl' : 'mx-auto max-w-7xl space-y-6'}>
          {tab === 'dashboard' && (
            <DashboardView
              boards={boards}
              boardId={boardId}
              columns={columns}
              cards={cards}
              onSelectBoard={setBoardId}
              onNewBoard={createBoard}
            />
          )}

          {tab === 'kanban' && (
            <div className="space-y-6">
              {showCategories && canManageBoard && (
                <CategoryManager
                  categories={categories}
                  onCreate={createCategory}
                  onUpdate={updateCategory}
                  onDelete={deleteCategory}
                />
              )}
              <KanbanView
                columns={columns}
                categories={categories}
                members={members}
                cards={cards}
                searchQuery={kanbanSearch}
                priorityFilter={kanbanPriority}
                onCreate={createCard}
                onEdit={editCard}
                onDelete={deleteCard}
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
              runReport={runReport}
            />
          )}

          {tab === 'calendar' && (
            <section className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
              <Calendar className="mx-auto mb-3 h-10 w-10 text-blue-500" />
              <h2 className="text-xl font-semibold text-gray-900">Calendar</h2>
              <p className="mt-2 text-gray-600">Visual calendar view is stubbed for Stage 2. All scheduling data lives in PostgreSQL cards.</p>
            </section>
          )}

          {tab === 'gantt' && (
            <section className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
              <GanttChart className="mx-auto mb-3 h-10 w-10 text-indigo-500" />
              <h2 className="text-xl font-semibold text-gray-900">Gantt</h2>
              <p className="mt-2 text-gray-600">Gantt timeline is stubbed for Stage 2. Use Kanban and Table report for real data.</p>
            </section>
          )}

          {tab === 'archive' && (
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">Archive</h2>
              <p className="mt-1 text-gray-600">Archived cards for this board.</p>
              <ul className="mt-4 divide-y divide-gray-100">
                {cards.filter((c) => c.archived).length === 0 && (
                  <li className="py-6 text-center text-gray-500">No archived cards.</li>
                )}
                {cards
                  .filter((c) => c.archived)
                  .map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{c.title}</p>
                        <p className="text-sm text-gray-500">
                          {c.priority} · {c.category_name || 'No category'}
                        </p>
                      </div>
                      <button type="button" className="btn-primary !py-1.5 !text-xs" onClick={() => restoreCard(c.id)}>
                        Restore
                      </button>
                    </li>
                  ))}
              </ul>
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
        </div>
      </main>
    </div>
  );
}
