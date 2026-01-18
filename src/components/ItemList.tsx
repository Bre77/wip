import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { WorkItem } from '../lib/types';
import { ItemCard } from './ItemCard';

interface ItemListProps {
  title: string;
  items: WorkItem[];
  filteredRepos: Set<string>;
  onReorder: (items: WorkItem[]) => void;
  onUpdateNotes: (id: string, notes: string | null) => void;
  onToggleHidden: (id: string, hidden: boolean) => void;
}

export function ItemList({
  title,
  items,
  filteredRepos,
  onReorder,
  onUpdateNotes,
  onToggleHidden,
}: ItemListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter items by selected repos (if any selected)
  const filteredItems = filteredRepos.size === 0
    ? items
    : items.filter(item => filteredRepos.has(item.repo));

  // Only show non-hidden items
  const visibleItems = filteredItems.filter(item => !item.hidden);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(items, oldIndex, newIndex);
        // Update priorities based on new order
        const reordered = newItems.map((item, index) => ({
          ...item,
          priority: index,
        }));
        onReorder(reordered);
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <h2 className="px-4 py-3 text-sm font-semibold text-gray-300 bg-gray-850 border-b border-gray-800">
        {title} ({visibleItems.length})
      </h2>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {visibleItems.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            No items to display
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={visibleItems.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {visibleItems.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onUpdateNotes={onUpdateNotes}
                  onToggleHidden={onToggleHidden}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
