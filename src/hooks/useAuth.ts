import { useState, useEffect } from 'react';
import type { User } from '../lib/types';
import { fetchUser } from '../lib/api';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser()
      .then(setUser)
      .catch(() => setUser({ authenticated: false }))
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}
