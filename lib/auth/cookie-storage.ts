/**
 * In-memory supabase-js storage that persists the session through httpOnly cookies
 * via /api/auth/session-store. Tokens are never written to localStorage.
 */
const memory = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** Remove leftover supabase tokens and any plaintext password ever saved in localStorage. */
export function purgeLegacyAuthLocalStorage(): void {
  if (!isBrowser()) return;
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("sb-") && key.includes("auth-token")) {
        localStorage.removeItem(key);
      }
    }
    const raw = localStorage.getItem("user");
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed && typeof parsed === "object" && "password" in parsed) {
      delete parsed.password;
      localStorage.setItem("user", JSON.stringify(parsed));
    }
  } catch {
    // Ignore malformed storage.
  }
}

export const httpOnlyCookieStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (memory.has(key)) {
      const cached = memory.get(key);
      return cached ? cached : null;
    }
    const pending = inflight.get(key);
    if (pending) return pending;
    if (!isBrowser()) return null;

    const request = (async () => {
      try {
        const res = await fetch(`/api/auth/session-store?key=${encodeURIComponent(key)}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) {
          memory.set(key, "");
          return null;
        }
        const json = (await res.json()) as { value?: string | null };
        const value = json.value ?? "";
        memory.set(key, value);
        return value || null;
      } catch {
        memory.set(key, "");
        return null;
      } finally {
        inflight.delete(key);
      }
    })();

    inflight.set(key, request);
    return request;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    memory.set(key, value);
    if (!isBrowser()) return;
    try {
      await fetch("/api/auth/session-store", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ key, value }),
      });
    } catch {
      // Network failures must not break in-memory auth for this tab.
    }
  },
  removeItem: async (key: string): Promise<void> => {
    memory.delete(key);
    if (!isBrowser()) return;
    try {
      await fetch("/api/auth/session-store", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ key }),
      });
    } catch {
      // Ignore.
    }
  },
};
