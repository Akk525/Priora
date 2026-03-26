import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Archive,
  Calendar,
  Ellipsis,
  GripVertical,
  MessageCircle,
  Plus,
  Tag,
} from 'lucide-react';
import type { Card, Category, Column, Member } from '../types';

type CardInput = {
  title: string;
  description?: string;
  columnId?: string;
  categoryId?: string;
  assigneeId?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate?: string;
  dueDate?: string;
};

const PRIORITY_BADGE: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
};

function formatDateShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function isOverdue(due: string | undefined) {
  if (!due) return false;
  const d = new Date(due);
  d.setHours(0, 0, 0, 0);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return d < t;
}

function categoryColor(categories: Category[], categoryId?: string | null): string {
  if (!categoryId) return '#3b82f6';
  const c = categories.find((x) => x.id === categoryId);
  return c?.color || '#3b82f6';
}

function buildItemsByColumn(columns: Column[], cards: Card[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const col of columns) map[col.id] = [];
  const byCol: Record<string, Card[]> = {};
  for (const col of columns) byCol[col.id] = [];
  for (const card of cards) {
    if (byCol[card.column_id]) byCol[card.column_id].push(card);
  }
  for (const col of columns) {
    const sorted = (byCol[col.id] ?? []).slice().sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
    map[col.id] = sorted.map((c) => c.id);
  }
  return map;
}

export function KanbanView({
  columns,
  categories,
  members,
  cards,
  searchQuery,
  priorityFilter,
  onCreate,
  onEdit,
  onDelete,
  onApplyCardOrder,
  canSeedDefaultColumns,
  onSeedDefaultColumns,
}: {
  columns: Column[];
  categories: Category[];
  members: Member[];
  cards: Card[];
  searchQuery: string;
  priorityFilter: string | null;
  onCreate: (payload: CardInput) => Promise<void>;
  onEdit: (cardId: string, payload: Record<string, unknown>) => Promise<void>;
  onDelete: (cardId: string) => Promise<void>;
  onApplyCardOrder: (nextByColumn: Record<string, string[]>) => Promise<void>;
  canSeedDefaultColumns?: boolean;
  onSeedDefaultColumns?: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<Card | null>(null);
  const [quickAddColumnId, setQuickAddColumnId] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const filteredCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return cards.filter((c) => {
      if (c.archived) return false;
      if (priorityFilter && c.priority !== priorityFilter) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        (c.category_name || '').toLowerCase().includes(q)
      );
    });
  }, [cards, searchQuery, priorityFilter]);

  const cardsByColumn = useMemo(() => {
    const map: Record<string, Card[]> = {};
    for (const col of columns) map[col.id] = [];
    for (const card of filteredCards) map[card.column_id]?.push(card);
    for (const col of columns) {
      map[col.id]?.sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
    }
    return map;
  }, [filteredCards, columns]);

  const itemsByColumn = useMemo(() => buildItemsByColumn(columns, filteredCards), [columns, filteredCards]);

  const cardById = useMemo(() => {
    const m: Record<string, Card> = {};
    for (const c of filteredCards) m[c.id] = c;
    return m;
  }, [filteredCards]);

  const sortedColumns = useMemo(() => [...columns].sort((a, b) => a.position - b.position), [columns]);

  const filtersActive = !!(searchQuery.trim() || priorityFilter);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const columnIdSet = useMemo(() => new Set(columns.map((c) => c.id)), [columns]);

  function findContainer(cardId: string): string | undefined {
    for (const col of columns) {
      if (itemsByColumn[col.id]?.includes(cardId)) return col.id;
    }
    return undefined;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const activeContainer = findContainer(activeId);
    if (!activeContainer) return;

    let overContainer = findContainer(overId);
    if (!overContainer && columnIdSet.has(overId)) {
      overContainer = overId;
    }
    if (!overContainer) return;

    const prev = { ...itemsByColumn };

    if (activeContainer === overContainer) {
      const list = [...(prev[activeContainer] ?? [])];
      const oldIndex = list.indexOf(activeId);
      const newIndex = list.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1) return;
      const nextList = arrayMove(list, oldIndex, newIndex);
      if (nextList.join(',') === list.join(',')) return;
      void onApplyCardOrder({ ...prev, [activeContainer]: nextList });
      return;
    }

    const sourceItems = [...(prev[activeContainer] ?? [])];
    const destItems = [...(prev[overContainer] ?? [])];
    const fromIdx = sourceItems.indexOf(activeId);
    if (fromIdx === -1) return;
    const [removed] = sourceItems.splice(fromIdx, 1);

    let insertIndex: number;
    if (columnIdSet.has(overId)) {
      insertIndex = destItems.length;
    } else {
      const j = destItems.indexOf(overId);
      insertIndex = j === -1 ? destItems.length : j;
    }
    destItems.splice(insertIndex, 0, removed);

    void onApplyCardOrder({
      ...prev,
      [activeContainer]: sourceItems,
      [overContainer]: destItems,
    });
  }

  const submitQuickAdd = async () => {
    if (!quickTitle.trim() || !quickAddColumnId) return;
    await onCreate({
      title: quickTitle.trim(),
      columnId: quickAddColumnId,
      priority: 'medium',
    });
    setQuickTitle('');
    setQuickAddColumnId(null);
  };

  const activeDragCard = activeDragId ? cardById[activeDragId] : null;

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Board</h2>
        <p className="text-xs text-gray-500">
          Drag by the grip to move cards. Click a card to edit. Use + beside a column name to add.
          {filtersActive ? ' Clear search and filters to reorder.' : ''}
        </p>
      </div>

      {quickAddColumnId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
          <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-4 shadow-xl">
            <h3 className="text-sm font-semibold text-gray-900">Quick add</h3>
            <input
              className="input-control mt-3"
              placeholder="Card title"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && void submitQuickAdd()}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setQuickAddColumnId(null)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={() => void submitQuickAdd()}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Edit card</h3>
            <CardFields
              form={{
                title: editing.title,
                description: editing.description,
                columnId: editing.column_id,
                categoryId: editing.category_id,
                assigneeId: editing.assignee_id,
                priority: editing.priority,
                startDate: editing.start_date,
                dueDate: editing.due_date,
              }}
              setForm={(next) => setEditing((prev) => (prev ? { ...prev, ...mapInputToCard(next, prev) } : prev))}
              columns={columns}
              categories={categories}
              members={members}
            />
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary"
                onClick={async () => {
                  if (!editing) return;
                  await onEdit(editing.id, {
                    title: editing.title,
                    description: editing.description,
                    columnId: editing.column_id,
                    categoryId: editing.category_id,
                    assigneeId: editing.assignee_id,
                    priority: editing.priority,
                    startDate: editing.start_date,
                    dueDate: editing.due_date,
                  });
                  setEditing(null);
                }}
              >
                Save
              </button>
              <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {columns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/80 p-8 text-center shadow-sm">
          <h3 className="text-base font-semibold text-gray-900">No columns on this board</h3>
          <p className="mt-2 text-sm text-gray-600">
            New boards get To Do, In Progress, In Review, and Done automatically.
          </p>
          {canSeedDefaultColumns && onSeedDefaultColumns ? (
            <button type="button" className="btn-primary mt-4" onClick={() => void onSeedDefaultColumns()}>
              Add default columns
            </button>
          ) : (
            <p className="mt-3 text-sm text-gray-500">Ask a board owner or admin to add columns.</p>
          )}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {sortedColumns.map((col) => {
              const colCards = cardsByColumn[col.id] ?? [];
              const sortableIds = itemsByColumn[col.id] ?? [];
              return (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  cards={colCards}
                  sortableIds={sortableIds}
                  categories={categories}
                  dragDisabled={filtersActive}
                  onEditCard={setEditing}
                  onDeleteCard={onDelete}
                  onQuickAdd={() => {
                    setQuickAddColumnId(col.id);
                    setQuickTitle('');
                  }}
                />
              );
            })}
          </div>
          <DragOverlay dropAnimation={null}>
            {activeDragCard ? (
              <div
                className="w-72 cursor-grabbing rounded border border-gray-200 bg-white p-2.5 opacity-95 shadow-lg"
                style={{ borderLeftWidth: 4, borderLeftColor: categoryColor(categories, activeDragCard.category_id) }}
              >
                <h3 className="text-xs font-medium text-gray-900">{activeDragCard.title}</h3>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </section>
  );
}

function KanbanColumn({
  column,
  cards,
  sortableIds,
  categories,
  dragDisabled,
  onEditCard,
  onDeleteCard,
  onQuickAdd,
}: {
  column: Column;
  cards: Card[];
  sortableIds: string[];
  categories: Category[];
  dragDisabled: boolean;
  onEditCard: (c: Card) => void;
  onDeleteCard: (id: string) => void;
  onQuickAdd: () => void;
}) {
  const { setNodeRef } = useDroppable({ id: column.id });

  return (
    <div className="column relative w-72 flex-shrink-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            title="Add card"
            className="flex-shrink-0 rounded p-1 text-gray-500 transition hover:bg-blue-50 hover:text-blue-600"
            onClick={onQuickAdd}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <h2 className="truncate text-sm font-semibold text-gray-800">{column.title}</h2>
          <span className="flex-shrink-0 rounded-full bg-gray-200 px-1.5 py-0.5 text-xs font-medium text-gray-600">
            {cards.length}
          </span>
        </div>
        <button type="button" className="flex-shrink-0 rounded p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700" aria-hidden>
          <Ellipsis className="h-3.5 w-3.5" />
        </button>
      </div>
      <div ref={setNodeRef} className="min-h-[400px] rounded-lg transition-all duration-200">
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          {cards.map((card, idx) => (
            <SortableCard
              key={card.id}
              card={card}
              categories={categories}
              indexInColumn={idx}
              dragDisabled={dragDisabled}
              onEdit={() => onEditCard(card)}
              onDelete={() => onDeleteCard(card.id)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

function SortableCard({
  card,
  categories,
  indexInColumn,
  dragDisabled,
  onEdit,
  onDelete,
}: {
  card: Card;
  categories: Category[];
  indexInColumn: number;
  dragDisabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    disabled: dragDisabled,
  });
  const accent = categoryColor(categories, card.category_id);
  const overdue = isOverdue(card.due_date);

  return (
    <div
      ref={setNodeRef}
      className="card-enter mb-2"
      {...attributes}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
        animationDelay: `${indexInColumn * 0.05}s`,
      }}
    >
      <div
        className="group/card relative flex gap-1 rounded border border-gray-200 bg-white p-2.5 shadow-sm transition hover:shadow-md"
        style={{ borderLeftWidth: 4, borderLeftColor: accent }}
      >
        <button
          type="button"
          className={`mt-0.5 flex-shrink-0 touch-none rounded p-0.5 ${
            dragDisabled ? 'cursor-not-allowed text-gray-200' : 'cursor-grab text-gray-400 hover:bg-gray-100 hover:text-gray-600 active:cursor-grabbing'
          }`}
          aria-label={dragDisabled ? 'Reordering disabled while filtering' : 'Drag to reorder'}
          disabled={dragDisabled}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="relative min-w-0 flex-1">
          <button
            type="button"
            title="Archive card"
            className="absolute right-0 top-0 z-10 rounded-full bg-red-500 p-1 text-white opacity-0 shadow-lg transition hover:bg-red-600 group-hover/card:opacity-100"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Archive className="h-3 w-3" />
          </button>
          <div
            className="cursor-pointer pr-7"
            tabIndex={0}
            onClick={() => onEdit()}
            onKeyDown={(e) => e.key === 'Enter' && onEdit()}
          >
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="text-xs font-medium text-gray-900">{card.title}</h3>
          <span className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium ${PRIORITY_BADGE[card.priority] ?? 'bg-gray-100 text-gray-800'}`}>
            {card.priority}
          </span>
        </div>
        {card.category_name && (
          <div className="mb-2">
            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: accent }}>
              {card.category_name}
            </span>
          </div>
        )}
        <p className="mb-2 line-clamp-2 text-xs text-gray-600">{card.description || 'No description'}</p>
        <div className="mb-2 flex flex-wrap gap-1">
          {card.category_name && (
            <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800">
              <Tag className="h-2 w-2" />
              {card.category_name.toLowerCase()}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800">
            <Tag className="h-2 w-2" />
            {card.priority}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            {card.due_date && (
              <div className={`flex items-center gap-1 ${overdue ? 'text-red-600' : ''}`}>
                <Calendar className="h-2.5 w-2.5" />
                <span>{formatDateShort(card.due_date)}</span>
                {overdue && <span className="text-xs">(overdue)</span>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 text-gray-400">
            <MessageCircle className="h-2.5 w-2.5" />
            <span>0</span>
          </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function mapInputToCard(input: CardInput, prev: Card): Partial<Card> {
  return {
    title: input.title,
    description: input.description,
    column_id: input.columnId || prev.column_id,
    category_id: input.categoryId,
    assignee_id: input.assigneeId,
    priority: input.priority,
    start_date: input.startDate,
    due_date: input.dueDate,
  };
}

function CardFields({
  form,
  setForm,
  columns,
  categories,
  members,
}: {
  form: CardInput;
  setForm: (next: CardInput) => void;
  columns: Column[];
  categories: Category[];
  members: Member[];
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <input className="input-control" placeholder="Title" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <input
        className="input-control sm:col-span-2"
        placeholder="Description"
        value={form.description || ''}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />
      <select className="input-control" value={form.columnId || ''} onChange={(e) => setForm({ ...form, columnId: e.target.value })}>
        <option value="">Column</option>
        {columns.map((c) => (
          <option value={c.id} key={c.id}>
            {c.title}
          </option>
        ))}
      </select>
      <select value={form.categoryId || ''} className="input-control" onChange={(e) => setForm({ ...form, categoryId: e.target.value || undefined })}>
        <option value="">Category</option>
        {categories.map((c) => (
          <option value={c.id} key={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select value={form.assigneeId || ''} className="input-control" onChange={(e) => setForm({ ...form, assigneeId: e.target.value || undefined })}>
        <option value="">Assignee</option>
        {members.map((m) => (
          <option value={m.user_id} key={m.user_id}>
            {m.name}
          </option>
        ))}
      </select>
      <select value={form.priority} className="input-control" onChange={(e) => setForm({ ...form, priority: e.target.value as CardInput['priority'] })}>
        <option>low</option>
        <option>medium</option>
        <option>high</option>
        <option>urgent</option>
      </select>
      <input type="date" className="input-control" value={form.startDate || ''} onChange={(e) => setForm({ ...form, startDate: e.target.value || undefined })} />
      <input type="date" className="input-control" value={form.dueDate || ''} onChange={(e) => setForm({ ...form, dueDate: e.target.value || undefined })} />
    </div>
  );
}
