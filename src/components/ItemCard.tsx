import { useState } from 'react';
import Markdown from 'react-markdown';
import type { PriorityValue, WorkItem } from '../lib/types';
import { PRIORITY_LEVELS, PRIORITY_COLORS } from '../lib/types';
import type { PriorityName } from '../lib/types';

interface ItemCardProps {
  item: WorkItem;
  onChangePriority: (id: string, priority: PriorityValue) => void;
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
  return 'text-gray-500';
}

function CiStatusBadge({ status }: { status: WorkItem['ciStatus'] }) {
  if (!status) return null;
  const config = {
    success: { label: 'CI', className: 'text-green-400 bg-green-950 border-green-800' },
    failure: { label: 'CI', className: 'text-red-400 bg-red-950 border-red-800' },
    pending: { label: 'CI', className: 'text-yellow-400 bg-yellow-950 border-yellow-800' },
    error: { label: 'CI', className: 'text-red-400 bg-red-950 border-red-800' },
  }[status];

  return (
    <span className={`px-1.5 py-0.5 text-xs rounded border ${config.className}`}>
      {config.label} {status === 'success' ? '\u2713' : status === 'failure' || status === 'error' ? '\u2717' : '\u2022\u2022\u2022'}
    </span>
  );
}

function MergeStatusBadge({ status }: { status: WorkItem['mergeable'] }) {
  if (!status || status === 'mergeable' || status === 'unknown') return null;
  return (
    <span className="px-1.5 py-0.5 text-xs rounded border text-red-400 bg-red-950 border-red-800">
      Conflicts
    </span>
  );
}

function ReviewStatusBadge({ status }: { status: WorkItem['reviewStatus'] }) {
  if (!status) return null;
  const config = {
    approved: { label: 'Approved', className: 'text-green-400 bg-green-950 border-green-800' },
    changes_requested: { label: 'Changes requested', className: 'text-red-400 bg-red-950 border-red-800' },
    review_required: { label: 'Review needed', className: 'text-yellow-400 bg-yellow-950 border-yellow-800' },
    pending_review: { label: 'Pending review', className: 'text-yellow-400 bg-yellow-950 border-yellow-800' },
  }[status];

  return (
    <span className={`px-1.5 py-0.5 text-xs rounded border ${config.className}`}>
      {config.label}
    </span>
  );
}

function PrioritySelector({ currentPriority, onSelect }: { currentPriority: PriorityValue; onSelect: (p: PriorityValue) => void }) {
  const levels: { name: PriorityName; value: PriorityValue }[] = [
    { name: 'uber', value: PRIORITY_LEVELS.uber },
    { name: 'high', value: PRIORITY_LEVELS.high },
    { name: 'normal', value: PRIORITY_LEVELS.normal },
    { name: 'low', value: PRIORITY_LEVELS.low },
    { name: 'meh', value: PRIORITY_LEVELS.meh },
  ];

  return (
    <div className="flex gap-1">
      {levels.map(({ name, value }) => {
        const isActive = currentPriority === value;
        const colors = PRIORITY_COLORS[name];
        return (
          <button
            key={name}
            onClick={() => onSelect(value)}
            className={`px-2 py-0.5 text-xs rounded border transition-colors ${
              isActive
                ? colors
                : 'text-gray-500 bg-gray-800 border-gray-700 hover:border-gray-600 hover:text-gray-400'
            }`}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}

export function ItemCard({ item, onChangePriority, onUpdateNotes, onToggleHidden }: ItemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [notesValue, setNotesValue] = useState(item.notes || '');

  const age = getAge(item.createdAt);
  const ageColor = getAgeColor(age.days);
  const updatedAge = getAge(item.updatedAt);

  const handleNotesBlur = () => {
    const trimmed = notesValue.trim();
    onUpdateNotes(item.id, trimmed || null);
  };

  if (item.hidden) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-3 border border-gray-700/50">
      <div className="flex items-start gap-2">
        {/* Type badge */}
        <span className={`mt-0.5 px-1.5 py-0.5 text-xs rounded font-medium shrink-0 ${
          item.type === 'pr'
            ? item.isDraft
              ? 'bg-gray-700 text-gray-400'
              : 'bg-purple-950 text-purple-300 border border-purple-800'
            : 'bg-green-950 text-green-300 border border-green-800'
        }`}>
          {item.type === 'pr' ? (item.isDraft ? 'Draft' : 'PR') : 'Issue'}
        </span>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-white hover:text-blue-400 line-clamp-1"
          >
            {item.title}
          </a>

          {/* Meta info row */}
          <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
            <span className="text-gray-500">{item.repo}</span>
            <span className="text-gray-600">#{item.number}</span>
            <span className="text-gray-600">&middot;</span>
            <span className={ageColor}>{age.text} old</span>
            <span className="text-gray-600">&middot;</span>
            <span className="text-gray-500">updated {updatedAge.text}</span>
          </div>

          {/* Status badges row (PR-specific) */}
          {item.type === 'pr' && (item.ciStatus || item.mergeable === 'conflicting' || item.reviewStatus) && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <CiStatusBadge status={item.ciStatus} />
              <MergeStatusBadge status={item.mergeable} />
              <ReviewStatusBadge status={item.reviewStatus} />
            </div>
          )}

          {/* Notes indicator */}
          {!expanded && item.notes && (
            <div className="mt-1 text-xs text-gray-500 truncate">
              {item.notes}
            </div>
          )}

          {/* Expanded view */}
          {expanded && (
            <div className="mt-3 space-y-3">
              {/* Priority selector */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Priority</label>
                <PrioritySelector
                  currentPriority={item.priority}
                  onSelect={(p) => onChangePriority(item.id, p)}
                />
              </div>

              {/* Body */}
              {item.body && (
                <div className="text-xs text-gray-300 prose prose-invert prose-xs max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-headings:my-2 prose-headings:text-sm prose-a:text-blue-400">
                  <Markdown>{item.body.replace(/<!--[\s\S]*?-->/g, '')}</Markdown>
                </div>
              )}

              {/* Notes textarea */}
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

        {/* Expand/Collapse button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-500 hover:text-gray-300 shrink-0"
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
