import type { ItemsResponse, User } from './types';

const API_BASE = '';

export async function fetchUser(): Promise<User> {
  const response = await fetch(`${API_BASE}/auth/me`);
  return response.json();
}

export async function fetchItems(): Promise<ItemsResponse> {
  const response = await fetch(`${API_BASE}/api/items`);
  if (!response.ok) {
    throw new Error('Failed to fetch items');
  }
  return response.json();
}

export async function refreshItems(): Promise<void> {
  const response = await fetch(`${API_BASE}/api/items`, { method: 'POST' });
  if (!response.ok) {
    throw new Error('Failed to refresh items');
  }
}

export async function updateItemPriority(id: string, priority: number): Promise<void> {
  const response = await fetch(`${API_BASE}/api/items/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priority }),
  });
  if (!response.ok) {
    throw new Error('Failed to update priority');
  }
}

export async function updateItemNotes(id: string, notes: string | null): Promise<void> {
  const response = await fetch(`${API_BASE}/api/items/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
  if (!response.ok) {
    throw new Error('Failed to update notes');
  }
}

export async function updateItemHidden(id: string, hidden: boolean): Promise<void> {
  const response = await fetch(`${API_BASE}/api/items/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hidden }),
  });
  if (!response.ok) {
    throw new Error('Failed to update hidden status');
  }
}

export async function batchUpdatePriorities(items: Array<{ id: string; priority: number }>): Promise<void> {
  const response = await fetch(`${API_BASE}/api/items/batch-priority`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!response.ok) {
    throw new Error('Failed to update priorities');
  }
}

export function login(): void {
  window.location.href = '/auth/login';
}

export async function logout(): Promise<void> {
  const response = await fetch('/auth/logout', { method: 'POST' });
  if (response.redirected) {
    window.location.href = response.url;
  } else {
    window.location.reload();
  }
}
