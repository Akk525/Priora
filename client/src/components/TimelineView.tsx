import { useMemo } from 'react';
import { Flag, StretchHorizontal } from 'lucide-react';
import type { Card } from '../types';

const DAY = 24 * 60 * 60 * 1000;

function atMidnight(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function formatLabel(value: Date) {
  return value.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function TimelineView({
  cards,
  onOpenCard,
}: {
  cards: Card[];
  onOpenCard: (card: Card) => void;
}) {
  const timelineCards = useMemo(() => {
    return cards
      .filter((card) => !card.archived && (card.start_date || card.due_date))
      .map((card) => {
        const start = atMidnight(new Date(card.start_date || card.due_date || new Date()));
        const end = atMidnight(new Date(card.due_date || card.start_date || new Date()));
        const safeEnd = end < start ? start : end;
        return { card, start, end: safeEnd };
      })
      .sort((left, right) => left.start.getTime() - right.start.getTime());
  }, [cards]);

  const bounds = useMemo(() => {
    if (timelineCards.length === 0) {
      const today = atMidnight(new Date());
      return { start: today, end: new Date(today.getTime() + 13 * DAY) };
    }
    const min = timelineCards.reduce((value, item) => (item.start < value ? item.start : value), timelineCards[0].start);
    const max = timelineCards.reduce((value, item) => (item.end > value ? item.end : value), timelineCards[0].end);
    const start = new Date(min.getTime() - 2 * DAY);
    const end = new Date(max.getTime() + 2 * DAY);
    return { start, end };
  }, [timelineCards]);

  const totalDays = Math.max(1, Math.round((bounds.end.getTime() - bounds.start.getTime()) / DAY) + 1);
  const axisDays = Array.from({ length: totalDays }, (_, index) => new Date(bounds.start.getTime() + index * DAY));

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Timeline</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-950">Execution plan</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Start and due dates are rendered as a lightweight Gantt view so you can sanity-check sequencing before a demo or handoff.
        </p>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_-40px_rgba(15,23,42,0.45)]">
        <div className="grid grid-cols-[280px_minmax(720px,1fr)] border-b border-slate-200 bg-slate-50">
          <div className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Card</div>
          <div className="grid" style={{ gridTemplateColumns: `repeat(${totalDays}, minmax(52px, 1fr))` }}>
            {axisDays.map((day) => (
              <div key={day.toISOString()} className="border-l border-slate-200 px-2 py-4 text-center text-[11px] font-semibold text-slate-500">
                {formatLabel(day)}
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          {timelineCards.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">Add start dates or due dates to cards to populate the timeline.</div>
          ) : (
            timelineCards.map(({ card, start, end }) => {
              const offset = Math.max(0, Math.round((start.getTime() - bounds.start.getTime()) / DAY));
              const span = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY) + 1);

              return (
                <div key={card.id} className="grid grid-cols-[280px_minmax(720px,1fr)] border-b border-slate-100 last:border-b-0">
                  <button type="button" onClick={() => onOpenCard(card)} className="px-6 py-5 text-left transition hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                        <Flag className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{card.title}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-400">{card.column_title || 'No column'}</p>
                      </div>
                    </div>
                  </button>
                  <div className="grid items-center px-0 py-3" style={{ gridTemplateColumns: `repeat(${totalDays}, minmax(52px, 1fr))` }}>
                    {axisDays.map((day) => (
                      <div key={`${card.id}-${day.toISOString()}`} className="h-14 border-l border-slate-100" />
                    ))}
                    <div
                      className="pointer-events-none row-start-1 mx-1 flex h-10 items-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 text-xs font-semibold text-white shadow-lg"
                      style={{
                        gridColumn: `${offset + 1} / span ${span}`,
                      }}
                    >
                      <StretchHorizontal className="mr-2 h-3.5 w-3.5" />
                      {card.priority}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
