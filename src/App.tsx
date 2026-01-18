import { useState, useCallback } from 'react';
import { useAuth } from './hooks/useAuth';
import { useItems } from './hooks/useItems';
import { Header } from './components/Header';
import { ItemList } from './components/ItemList';
import { RepoFilters } from './components/RepoFilters';
import { login } from './lib/api';

function App() {
  const { user, loading: authLoading } = useAuth();
  const authenticated = user?.authenticated ?? false;

  const {
    pullRequests,
    issues,
    loading: itemsLoading,
    error,
    refreshing,
    refresh,
    reorderPRs,
    reorderIssues,
    updateNotes,
    toggleHidden,
  } = useItems(authenticated);

  // Separate filter state for PRs and Issues
  const [prFilteredRepos, setPrFilteredRepos] = useState<Set<string>>(new Set());
  const [issueFilteredRepos, setIssueFilteredRepos] = useState<Set<string>>(new Set());

  const togglePrRepo = useCallback((repo: string) => {
    setPrFilteredRepos(prev => {
      const next = new Set(prev);
      if (next.has(repo)) {
        next.delete(repo);
      } else {
        next.add(repo);
      }
      return next;
    });
  }, []);

  const toggleIssueRepo = useCallback((repo: string) => {
    setIssueFilteredRepos(prev => {
      const next = new Set(prev);
      if (next.has(repo)) {
        next.delete(repo);
      } else {
        next.add(repo);
      }
      return next;
    });
  }, []);

  // Show loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  // Show login screen for unauthenticated users
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        <Header user={user} refreshing={false} onRefresh={() => {}} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              Track Your GitHub Work in Progress
            </h2>
            <p className="text-gray-400 mb-8 max-w-md">
              View all your open PRs and issues across repositories, prioritize them with drag-and-drop, and add private notes.
            </p>
            <button
              onClick={() => login()}
              className="px-6 py-3 text-lg bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Login with GitHub
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Header user={user} refreshing={refreshing} onRefresh={refresh} />

      {error && (
        <div className="px-6 py-3 bg-red-900/50 border-b border-red-800 text-red-200 text-sm">
          {error}
        </div>
      )}

      {itemsLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-400">Loading items...</div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-x divide-gray-800">
          {/* Pull Requests Column */}
          <div className="flex flex-col min-h-0">
            <RepoFilters
              items={pullRequests}
              selectedRepos={prFilteredRepos}
              onToggleRepo={togglePrRepo}
            />
            <ItemList
              title="Pull Requests"
              items={pullRequests}
              filteredRepos={prFilteredRepos}
              onReorder={reorderPRs}
              onUpdateNotes={updateNotes}
              onToggleHidden={toggleHidden}
            />
          </div>

          {/* Issues Column */}
          <div className="flex flex-col min-h-0">
            <RepoFilters
              items={issues}
              selectedRepos={issueFilteredRepos}
              onToggleRepo={toggleIssueRepo}
            />
            <ItemList
              title="Issues"
              items={issues}
              filteredRepos={issueFilteredRepos}
              onReorder={reorderIssues}
              onUpdateNotes={updateNotes}
              onToggleHidden={toggleHidden}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
