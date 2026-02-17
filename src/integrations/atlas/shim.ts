// Temporary shim to replace Supabase during migration to MongoDB Atlas.
// Replace implementations with real Atlas (or backend) calls.

type Result<T> = Promise<{ data: T | null; error?: any }>;

function buildQuery(filters: Record<string, any>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null) params.set(k, String(v));
  });
  return params.toString();
}

function tableEndpoint(table: string) {
  switch (table) {
    case 'profiles':
      return '/api/profiles';
    case 'students':
      return '/api/students';
    case 'attendance':
      return '/api/attendance';
    default:
      return `/api/${table}`;
  }
}

export const supabase = {
  from: (table: string) => {
    const filters: Record<string, any> = {};
    const api = tableEndpoint(table);

    return {
      eq: (field: string, value: any) => {
        filters[field] = value;
        return this;
      },
      order: (_field: string) => {
        // no-op for now
        return this;
      },
      select: async (_fields?: string) => {
        const qs = buildQuery(filters);
        const url = qs ? `${api}?${qs}` : api;
        const resp = await fetch(url);
        const json = await resp.json();
        return { data: json.data || json, error: null };
      },
      single: async () => {
        const qs = buildQuery(filters);
        const url = qs ? `${api}?${qs}` : api;
        const resp = await fetch(url);
        const json = await resp.json();
        const data = Array.isArray(json.data) ? json.data[0] : json.data;
        return { data: data ?? null, error: null };
      },
      insert: async (payload: any) => {
        const resp = await fetch(api, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await resp.json();
        return { data: json.data ?? json, error: json.error ?? null };
      },
      delete: async () => {
        const qs = buildQuery(filters);
        const url = qs ? `${api}?${qs}` : api;
        const resp = await fetch(url, { method: 'DELETE' });
        const json = await resp.json();
        return { data: json, error: null };
      },
    } as any;
  },

  auth: {
    // kept for compatibility but auth is handled by backend endpoints
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    getSession: async () => ({ data: { session: null } }),
    signInWithPassword: async () => ({ data: null, error: 'Use backend /api/auth/signin' }),
    signUp: async () => ({ data: null, error: 'Use backend /api/auth/signup' }),
    signOut: async () => ({ data: null, error: 'Use backend /api/auth/signout' }),
  },
};

export default supabase;
