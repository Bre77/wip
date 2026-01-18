import { useState, useEffect, useCallback } from 'react';
import type { WorkItem } from '../lib/types';
import {
  fetchItems,
  refreshItems,
  updateItemNotes,
  updateItemHidden,
  batchUpdatePriorities,
} from '../lib/api';

export function useItems(authenticated: boolean) {
  const [pullRequests, setPullRequests] = useState<WorkItem[]>([]);
  const [issues, setIssues] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadItems = useCallback(async () => {
    if (!authenticated) return;

    try {
      setLoading(true);
      setError(null);
      const data = await fetchItems();
      setPullRequests(data.pullRequests);
      setIssues(data.issues);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [authenticated]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const refresh = useCallback(async () => {
    if (!authenticated) return;

    try {
      setRefreshing(true);
      await refreshItems();
      await loadItems();
    } finally {
      setRefreshing(false);
    }
  }, [authenticated, loadItems]);

  const reorderPRs = useCallback(async (items: WorkItem[]) => {
    setPullRequests(items);
    const updates = items.map((item, index) => ({ id: item.id, priority: index }));
    await batchUpdatePriorities(updates);
  }, []);

  const reorderIssues = useCallback(async (items: WorkItem[]) => {
    setIssues(items);
    const updates = items.map((item, index) => ({ id: item.id, priority: index }));
    await batchUpdatePriorities(updates);
  }, []);

  const updateNotes = useCallback(async (id: string, notes: string | null) => {
    await updateItemNotes(id, notes);

    // Update local state
    const updateItem = (items: WorkItem[]) =>
      items.map(item => item.id === id ? { ...item, notes } : item);

    setPullRequests(updateItem);
    setIssues(updateItem);
  }, []);

  const toggleHidden = useCallback(async (id: string, hidden: boolean) => {
    await updateItemHidden(id, hidden);

    // Update local state
    const updateItem = (items: WorkItem[]) =>
      items.map(item => item.id === id ? { ...item, hidden } : item);

    setPullRequests(updateItem);
    setIssues(updateItem);
  }, []);

  return {
    pullRequests,
    issues,
    loading,
    error,
    refreshing,
    refresh,
    reorderPRs,
    reorderIssues,
    updateNotes,
    toggleHidden,
  };
}
