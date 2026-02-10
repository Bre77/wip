import { useState, useEffect, useCallback } from 'react';
import type { PriorityValue, WorkItem } from '../lib/types';
import { PRIORITY_NAMES } from '../lib/types';
import {
  fetchItems,
  refreshItems,
  updateItemPriority,
  updateItemNotes,
  updateItemHidden,
} from '../lib/api';

export function useItems(authenticated: boolean) {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadItems = useCallback(async () => {
    if (!authenticated) return;

    try {
      setLoading(true);
      setError(null);
      const data = await fetchItems();
      setItems(data.items);
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

  const changePriority = useCallback(async (id: string, priority: PriorityValue) => {
    // Optimistic update
    setItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, priority, priorityName: PRIORITY_NAMES[priority] }
          : item
      ).sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
    );
    await updateItemPriority(id, priority);
  }, []);

  const updateNotes = useCallback(async (id: string, notes: string | null) => {
    await updateItemNotes(id, notes);
    setItems(prev =>
      prev.map(item => item.id === id ? { ...item, notes } : item)
    );
  }, []);

  const toggleHidden = useCallback(async (id: string, hidden: boolean) => {
    await updateItemHidden(id, hidden);
    setItems(prev =>
      prev.map(item => item.id === id ? { ...item, hidden } : item)
    );
  }, []);

  return {
    items,
    loading,
    error,
    refreshing,
    refresh,
    changePriority,
    updateNotes,
    toggleHidden,
  };
}
