import { login, logout } from '../lib/api';
import type { User } from '../lib/types';

interface HeaderProps {
  user: User | null;
  refreshing: boolean;
  onRefresh: () => void;
}

export function Header({ user, refreshing, onRefresh }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800">
      <h1 className="text-xl font-semibold text-white">GitHub WIP Tracker</h1>

      <div className="flex items-center gap-4">
        {user?.authenticated && (
          <>
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <span className="text-sm text-gray-400">@{user.username}</span>
            <button
              onClick={() => logout()}
              className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md transition-colors"
            >
              Logout
            </button>
          </>
        )}
        {user && !user.authenticated && (
          <button
            onClick={() => login()}
            className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
          >
            Login with GitHub
          </button>
        )}
      </div>
    </header>
  );
}
