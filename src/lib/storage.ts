// Preferences must not break gameplay in private/restricted browser contexts.
const fallback = new Map<string, string>();
export const storage = {
  getItem(key: string): string | null { try { return localStorage.getItem(key); } catch { return fallback.get(key) ?? null; } },
  setItem(key: string, value: string) { fallback.set(key, value); try { localStorage.setItem(key, value); } catch { /* memory fallback */ } },
  removeItem(key: string) { fallback.delete(key); try { localStorage.removeItem(key); } catch { /* unavailable */ } },
  keys(): string[] { try { return Object.keys(localStorage); } catch { return [...fallback.keys()]; } },
};
