import type { WorkItem } from '../lib/types';

interface RepoFiltersProps {
  items: WorkItem[];
  selectedRepos: Set<string>;
  onToggleRepo: (repo: string) => void;
}

export function RepoFilters({ items, selectedRepos, onToggleRepo }: RepoFiltersProps) {
  // Count items per repo
  const repoCounts = new Map<string, number>();
  for (const item of items) {
    if (!item.hidden) {
      repoCounts.set(item.repo, (repoCounts.get(item.repo) || 0) + 1);
    }
  }

  // Sort repos by count (descending)
  const sortedRepos = Array.from(repoCounts.entries())
    .sort((a, b) => b[1] - a[1]);

  if (sortedRepos.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 px-4 py-2 bg-gray-850 border-b border-gray-800">
      {sortedRepos.map(([repo, count]) => {
        const isSelected = selectedRepos.has(repo);
        // Get short name (owner/repo -> repo)
        const shortName = repo.split('/').pop() || repo;

        return (
          <button
            key={repo}
            onClick={() => onToggleRepo(repo)}
            className={`px-2 py-1 text-xs rounded-full transition-colors ${
              isSelected
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title={repo}
          >
            {shortName} <span className="opacity-70">{count}</span>
          </button>
        );
      })}
      {selectedRepos.size > 0 && (
        <button
          onClick={() => {
            // Clear all selections
            selectedRepos.forEach(repo => onToggleRepo(repo));
          }}
          className="px-2 py-1 text-xs text-gray-400 hover:text-gray-200"
        >
          Clear
        </button>
      )}
    </div>
  );
}
