import { useState } from 'react';
import { Tag, Trash2 } from 'lucide-react';
import type { Category } from '../types';

export function CategoryManager({
  categories,
  onCreate,
  onUpdate,
  onDelete,
}: {
  categories: Category[];
  onCreate: (name: string, color: string) => Promise<void>;
  onUpdate: (id: string, name: string, color: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6b7280');

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
        <Tag className="h-5 w-5 text-indigo-600" />
        Category manager
      </h3>
      <div className="mb-6 flex flex-wrap gap-2">
        <input className="input-control max-w-xs flex-1" placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="color" className="h-10 w-14 cursor-pointer rounded border border-gray-300" value={color} onChange={(e) => setColor(e.target.value)} />
        <button type="button" className="btn-primary" onClick={() => onCreate(name, color).then(() => setName(''))}>
          Add
        </button>
      </div>
      <ul className="space-y-3">
        {categories.map((c) => (
          <CategoryItem key={c.id} category={c} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </ul>
    </section>
  );
}

function CategoryItem({
  category,
  onUpdate,
  onDelete,
}: {
  category: Category;
  onUpdate: (id: string, name: string, color: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color);
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <input className="input-control !w-auto min-w-[160px]" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="color" className="h-9 w-12 cursor-pointer rounded border border-gray-300" value={color} onChange={(e) => setColor(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn-secondary !py-1.5 !text-xs" onClick={() => onUpdate(category.id, name, color)}>
          Save
        </button>
        <button type="button" className="btn-danger !py-1.5 !text-xs" onClick={() => onDelete(category.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}
