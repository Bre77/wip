import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Markdown from 'react-markdown';
import type { WorkItem } from '../lib/types';

interface ItemCardProps {
  item: WorkItem;
  onUpdateNotes: (id: string, notes: string | null) => void;
  onToggleHidden: (id: string, hidden: boolean) => void;
}

function getAge(dateString: string): { days: number; text: string } {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days === 0) return { days, text: 'today' };
  if (days === 1) return { days, text: '1d' };
  return { days, text: `${days}d` };
}

function getAgeColor(days: number): string {
  if (days >= 28) return 'text-red-400';
  if (days >= 7) return 'text-yellow-400';
  return 'text-gray-400';
}

function getAgeIndicator(days: number): string {
  if (days >= 28) return ' \ud83d\udd34';
  if (days >= 7) return ' \u26a0\ufe0f';
  return '';
}

export function ItemCard({ item, onUpdateNotes, onToggleHidden }: ItemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [notesValue, setNotesValue] = useState(item.notes || '');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const age = getAge(item.createdAt);
  const ageColor = getAgeColor(age.days);
  const ageIndicator = getAgeIndicator(age.days);
  const updatedAge = getAge(item.updatedAt);

  const handleSaveNotes = () => {
    const trimmed = notesValue.trim();
    onUpdateNotes(item.id, trimmed || null);
  };

  // Update local state when item.notes changes (e.g., after save)
  const handleNotesBlur = () => {
    handleSaveNotes();
  };

  if (item.hidden) {
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-gray-800 rounded-lg p-3 ${isDragging ? 'opacity-50 shadow-lg' : ''}`}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-1 text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-white hover:text-blue-400 line-clamp-1"
            onClick={(e) => e.stopPropagation()}
          >
            {item.title}
          </a>

          {/* Meta info */}
          <div className="flex items-center gap-2 mt-1 text-xs">
            <span className="text-gray-500">{item.repo}</span>
            <span className="text-gray-600">#{item.number}</span>
            <span className="text-gray-600">&middot;</span>
            <span className={ageColor}>
              {age.text}{ageIndicator}
            </span>
            <span className="text-gray-600">&middot;</span>
            <span className="text-gray-500">
              updated {updatedAge.text}
            </span>
          </div>

          {/* Expanded view */}
          {expanded && (
            <div className="mt-3 space-y-3">
              {/* Body */}
              {item.body && (
                <div className="text-xs text-gray-300 prose prose-invert prose-xs max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-headings:my-2 prose-headings:text-sm prose-a:text-blue-400">
                  <Markdown>{item.body.replace(/<!--[\s\S]*?-->/g, '')}</Markdown>
                </div>
              )}

              {/* Notes textarea - always visible when expanded */}
              <textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                onBlur={handleNotesBlur}
                className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white resize-none focus:outline-none focus:border-blue-500"
                rows={2}
                placeholder="Add private notes..."
              />

              {/* Hide button */}
              <button
                onClick={() => onToggleHidden(item.id, true)}
                className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
              >
                Hide
              </button>
            </div>
          )}
        </div>

        {/* Expand/Collapse button - always in same position */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-500 hover:text-gray-300"
        >
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
