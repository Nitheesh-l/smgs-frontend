// Use environment variable for API base URL (for deployed environments)
// Falls back to relative paths (Vite proxy in dev, same-origin in prod)
const API_BASE = import.meta.env.VITE_API_BASE || '';

export async function parseJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

export async function fetchJson(
  url: string,
  options?: RequestInit
): Promise<{ res: Response; data: any }> {
  try {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
    const res = await fetch(fullUrl, options);
    let data = null;

    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    }

    return { res, data };
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}