import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import type { Card, Column } from '../types';

type CalendarEvent = {
  id: string;
  title: string;
  dueDate: string;
  columnTitle?: string;
  priority: Card['priority'];
};

const priorityClass: Record<Card['priority'], string> = {
  low: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-rose-100 text-rose-800',
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: 'short' });
}

function formatMonthLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function CalendarView({
  cards,
  columns,
  onOpenCard,
}: {
  cards: Card[];
  columns: Column[];
  onOpenCard: (card: Card) => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));

  const columnMap = useMemo(() => Object.fromEntries(columns.map((column) => [column.id, column.title])), [columns]);

  const events = useMemo<CalendarEvent[]>(
    () =>
      cards
        .filter((card) => !card.archived && card.due_date)
        .map((card) => ({
          id: card.id,
          title: card.title,
          dueDate: card.due_date!,
          columnTitle: card.column_title || columnMap[card.column_id],
          priority: card.priority,
        })),
    [cards, columnMap],
  );

  const eventMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = toDayKey(new Date(event.dueDate));
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const monthStart = startOfMonth(visibleMonth);
  const gridStart = addDays(monthStart, -monthStart.getDay());
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));

  const upcoming = events
    .slice()
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate))
    .slice(0, 5);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Calendar</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">Deadline view</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Due dates flow directly from card data. Click any item to jump back into the editor.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 p-1 shadow-sm">
          <button type="button" className="rounded-full p-2 text-slate-600 transition hover:bg-slate-100" onClick={() => setVisibleMonth((value) => addMonths(value, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-40 text-center text-sm font-semibold text-slate-900">{formatMonthLabel(visibleMonth)}</div>
          <button type="button" className="rounded-full p-2 text-slate-600 transition hover:bg-slate-100" onClick={() => setVisibleMonth((value) => addMonths(value, 1))}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_-40px_rgba(15,23,42,0.45)]">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/90">
            {days.slice(0, 7).map((day) => (
              <div key={formatDayLabel(day)} className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {formatDayLabel(day)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dayKey = toDayKey(day);
              const inMonth = day.getMonth() === visibleMonth.getMonth();
              const dayEvents = eventMap.get(dayKey) ?? [];
              const cardsForDay = cards.filter((card) => card.due_date?.slice(0, 10) === dayKey);

              return (
                <div
                  key={dayKey}
                  className={`min-h-36 border-b border-r border-slate-200 px-3 py-3 align-top ${inMonth ? 'bg-white' : 'bg-slate-50/50'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${inMonth ? 'text-slate-900' : 'text-slate-400'}`}>{day.getDate()}</span>
                    {dayEvents.length > 0 && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{dayEvents.length}</span>
                    )}
                  </div>
                  <div className="mt-3 space-y-2">
                    {cardsForDay.slice(0, 3).map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => onOpenCard(card)}
                        className={`w-full rounded-2xl px-3 py-2 text-left text-xs font-medium shadow-sm transition hover:-translate-y-0.5 ${priorityClass[card.priority]}`}
                      >
                        <div className="truncate">{card.title}</div>
                        <div className="mt-1 truncate text-[11px] opacity-80">{card.column_title || columnMap[card.column_id] || 'Unassigned stage'}</div>
                      </button>
                    ))}
                    {cardsForDay.length > 3 && <p className="text-[11px] font-medium text-slate-500">+{cardsForDay.length - 3} more</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="rounded-[28px] border border-slate-200 bg-white/95 p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.45)]">
          <div className="flex items-center gap-2 text-slate-900">
            <Clock3 className="h-5 w-5 text-cyan-600" />
            <h3 className="text-lg font-semibold">Upcoming deadlines</h3>
          </div>
          <div className="mt-5 space-y-3">
            {upcoming.length === 0 && <p className="text-sm text-slate-500">Add due dates to cards to populate the calendar.</p>}
            {upcoming.map((event) => (
              <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate font-medium text-slate-900">{event.title}</p>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${priorityClass[event.priority]}`}>{event.priority}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{new Date(event.dueDate).toLocaleDateString()}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-400">{event.columnTitle || 'No column'}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
