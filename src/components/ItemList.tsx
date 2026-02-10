import { useMemo } from 'react';
import type { PriorityName, PriorityValue, WorkItem } from '../lib/types';
import { PRIORITY_LEVELS, PRIORITY_HEADER_COLORS } from '../lib/types';
import { ItemCard } from './ItemCard';

interface ItemListProps {
  items: WorkItem[];
  filteredRepos: Set<string>;
  onChangePriority: (id: string, priority: PriorityValue) => void;
  onUpdateNotes: (id: string, notes: string | null) => void;
  onToggleHidden: (id: string, hidden: boolean) => void;
}

const PRIORITY_ORDER: { name: PriorityName; value: PriorityValue }[] = [
  { name: 'uber', value: PRIORITY_LEVELS.uber },
  { name: 'high', value: PRIORITY_LEVELS.high },
  { name: 'normal', value: PRIORITY_LEVELS.normal },
  { name: 'low', value: PRIORITY_LEVELS.low },
  { name: 'meh', value: PRIORITY_LEVELS.meh },
];

export function ItemList({
  items,
  filteredRepos,
  onChangePriority,
  onUpdateNotes,
  onToggleHidden,
}: ItemListProps) {
  // Filter items by selected repos (if any selected)
  const filteredItems = filteredRepos.size === 0
    ? items
    : items.filter(item => filteredRepos.has(item.repo));

  // Only show non-hidden items
  const visibleItems = filteredItems.filter(item => !item.hidden);

  // Group by priority
  const groups = useMemo(() => {
    const map = new Map<PriorityValue, WorkItem[]>();
    for (const item of visibleItems) {
      const list = map.get(item.priority) ?? [];
      list.push(item);
      map.set(item.priority, list);
    }
    return map;
  }, [visibleItems]);

  if (visibleItems.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-gray-500">No items to display</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {PRIORITY_ORDER.map(({ name, value }) => {
        const groupItems = groups.get(value);
        if (!groupItems || groupItems.length === 0) return null;

        const colors = PRIORITY_HEADER_COLORS[name];

        return (
          <div key={name}>
            <div className={`px-3 py-2 rounded-t-lg border-b ${colors} flex items-center justify-between`}>
              <h3 className="text-sm font-semibold capitalize">{name}</h3>
              <span className="text-xs opacity-70">{groupItems.length}</span>
            </div>
            <div className="space-y-2 pt-2">
              {groupItems.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onChangePriority={onChangePriority}
                  onUpdateNotes={onUpdateNotes}
                  onToggleHidden={onToggleHidden}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
