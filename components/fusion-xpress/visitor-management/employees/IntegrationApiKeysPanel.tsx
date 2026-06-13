"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";

import { INTEGRATION_SCOPES } from "@/lib/integrations/api-key";
import { supabase } from "@/lib/supabase";

type IntegrationKeyRecord = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
};

type IntegrationApiKeysPanelProps = {
  disabled?: boolean;
  buildApiUrl?: (path: string) => string;
};

export default function IntegrationApiKeysPanel({
  disabled,
  buildApiUrl = (path) => path,
}: IntegrationApiKeysPanelProps) {
  const [keys, setKeys] = useState<IntegrationKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [name, setName] = useState("Payroll integration");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const apiBase = typeof window !== "undefined" ? window.location.origin : "";
  const docsUrl = `${apiBase}/api/integrations/v1`;

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(buildApiUrl("/api/visitor-employees/integration-keys"), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        keys?: IntegrationKeyRecord[];
        setupRequired?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to load keys");
      if (json.setupRequired) {
        setSetupRequired(true);
        setKeys([]);
        return;
      }
      setKeys(Array.isArray(json.keys) ? json.keys : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load keys");
    } finally {
      setLoading(false);
    }
  }, [buildApiUrl, getToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNewKey(null);
    setSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch(buildApiUrl("/api/visitor-employees/integration-keys"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, scopes: [...INTEGRATION_SCOPES] }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        key?: string;
        record?: IntegrationKeyRecord;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to create key");
      if (json.key) setNewKey(json.key);
      if (json.record) setKeys((prev) => [json.record!, ...prev]);
      setName("Payroll integration");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create key");
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (id: string) => {
    if (!window.confirm("Revoke this API key? Connected systems will stop working immediately.")) {
      return;
    }
    setRevokingId(id);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch(buildApiUrl(`/api/visitor-employees/integration-keys/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to revoke key");
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to revoke key");
    } finally {
      setRevokingId(null);
    }
  };

  const copyKey = async () => {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
        <KeyRound className="w-5 h-5 text-primary-600" aria-hidden />
        <div>
          <h2 className="text-sm font-bold text-gray-900">HR &amp; payroll integrations</h2>
          <p className="text-xs font-semibold text-gray-500 mt-0.5">
            API keys for external HR &amp; payroll systems. Supports read/write sync and automated payroll runs.{" "}
            <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-700 hover:underline">
              API docs
            </a>
          </p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {setupRequired ? (
          <p className="text-sm text-amber-800 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            Run <code className="text-xs">database/visitor_employees_patch_13_integration_api.sql</code> in Supabase.
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-red-800 rounded-lg border border-red-200 bg-red-50 px-3 py-2">{error}</p>
        ) : null}
        {newKey ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm">
            <p className="font-semibold text-emerald-900">New API key — copy now</p>
            <p className="mt-2 break-all font-mono text-xs text-gray-900 bg-white/80 rounded border border-emerald-100 px-2 py-2">
              {newKey}
            </p>
            <button
              type="button"
              onClick={() => void copyKey()}
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-900 hover:underline"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? "Copied" : "Copy key"}
            </button>
          </div>
        ) : null}

        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <label className="flex-1 block">
            <span className="text-xs font-semibold text-gray-600">Key name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={disabled || saving || setupRequired}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g. Sage payroll"
              required
            />
          </label>
          <button
            type="submit"
            disabled={disabled || saving || setupRequired}
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-primary-700 px-4 py-2 text-sm font-bold text-white hover:bg-primary-800 disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            Create key
          </button>
        </form>

        {loading ? (
          <p className="text-sm text-gray-500">Loading keys…</p>
        ) : keys.length === 0 ? (
          <p className="text-sm text-gray-500">No active API keys.</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {keys.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-sm">
                <div>
                  <p className="font-semibold text-gray-900">{k.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{k.keyPrefix}…</p>
                  {k.lastUsedAt ? (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Last used {new Date(k.lastUsedAt).toLocaleString()}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-0.5">Never used</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void revoke(k.id)}
                  disabled={disabled || revokingId === k.id}
                  className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {revokingId === k.id ? "Revoking…" : "Revoke"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
