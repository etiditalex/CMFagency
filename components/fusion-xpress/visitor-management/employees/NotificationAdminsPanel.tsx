"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, MessageCircle, Plus, Trash2 } from "lucide-react";

import { supabase } from "@/lib/supabase";

export type NotificationAdmin = {
  id: string;
  email: string;
  fullName: string;
  notifySignIn: boolean;
  notifySignOut: boolean;
  whatsappPhone: string;
  notifyWhatsapp: boolean;
  createdAt: string;
};

type NotificationAdminsPanelProps = {
  disabled?: boolean;
};

export default function NotificationAdminsPanel({ disabled }: NotificationAdminsPanelProps) {
  const [admins, setAdmins] = useState<NotificationAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [notifySignOut, setNotifySignOut] = useState(true);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);
  const [ownerWhatsapp, setOwnerWhatsapp] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingOwnerWhatsapp, setSavingOwnerWhatsapp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const loadOwnerSettings = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/visitor-employees/notification-settings", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as { attendanceWhatsapp?: string };
      if (res.ok) setOwnerWhatsapp(json.attendanceWhatsapp ?? "");
    } catch {
      /* optional */
    }
  }, [getToken]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/visitor-employees/notification-admins", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        admins?: NotificationAdmin[];
        setupRequired?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      if (json.setupRequired) {
        setSetupRequired(true);
        setAdmins([]);
        return;
      }
      setAdmins(Array.isArray(json.admins) ? json.admins : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load admins");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void load();
    void loadOwnerSettings();
  }, [load, loadOwnerSettings]);

  const handleSaveOwnerWhatsapp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOwnerWhatsapp(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/visitor-employees/notification-settings", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ attendanceWhatsapp: ownerWhatsapp }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not save");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save owner WhatsApp");
    } finally {
      setSavingOwnerWhatsapp(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/visitor-employees/notification-admins", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          fullName,
          notifySignIn: true,
          notifySignOut,
          whatsappPhone,
          notifyWhatsapp,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { admin?: NotificationAdmin; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not add admin");
      if (json.admin) setAdmins((prev) => [...prev, json.admin!]);
      setEmail("");
      setFullName("");
      setWhatsappPhone("");
      setNotifySignOut(true);
      setNotifyWhatsapp(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not add admin");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`/api/visitor-employees/notification-admins/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? "Could not remove");
      }
      setAdmins((prev) => prev.filter((a) => a.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not remove");
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
        <Mail className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-bold text-gray-800">Attendance notifications</span>
      </div>
      <div className="p-4 space-y-4">
        <p className="text-xs text-gray-600">
          When staff sign in or out, the account owner and listed recipients automatically receive an
          email with <strong>today&apos;s attendance register</strong> attached as Excel — no login
          required. Add a WhatsApp number below to also receive alerts and a download link on your phone.
        </p>
        {setupRequired ? (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Run <code className="font-mono">database/visitor_employees_patch_02_notification_admins.sql</code>{" "}
            in Supabase to enable extra recipients.
          </p>
        ) : null}
        {error ? (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        ) : null}

        <form onSubmit={handleSaveOwnerWhatsapp} className="rounded-lg border border-gray-100 bg-gray-50/80 p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            Owner WhatsApp (optional)
          </div>
          <p className="text-[10px] text-gray-500">
            International format without +, e.g. 254712345678. Requires WhatsApp Cloud API on the server.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 items-end">
            <label className="flex-1 min-w-[160px]">
              <span className="text-[10px] font-semibold uppercase text-gray-500">WhatsApp number</span>
              <input
                type="tel"
                disabled={disabled}
                value={ownerWhatsapp}
                onChange={(e) => setOwnerWhatsapp(e.target.value.replace(/\D/g, ""))}
                placeholder="254712345678"
                className="mt-0.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={disabled || savingOwnerWhatsapp}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
            >
              {savingOwnerWhatsapp ? "Saving…" : "Save"}
            </button>
          </div>
        </form>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : admins.length > 0 ? (
          <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
            {admins.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{a.email}</p>
                  {a.fullName ? <p className="text-xs text-gray-500">{a.fullName}</p> : null}
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Sign-in emails{a.notifySignOut ? " · Sign-out emails" : ""}
                    {a.whatsappPhone && a.notifyWhatsapp ? ` · WhatsApp ${a.whatsappPhone}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => void handleRemove(a.id)}
                  className="shrink-0 rounded p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  aria-label={`Remove ${a.email}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No extra email recipients yet.</p>
        )}
        <form onSubmit={handleAdd} className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-end">
            <label className="flex-1 min-w-[140px]">
              <span className="text-[10px] font-semibold uppercase text-gray-500">Email</span>
              <input
                type="email"
                required
                disabled={disabled || setupRequired}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-0.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex-1 min-w-[120px]">
              <span className="text-[10px] font-semibold uppercase text-gray-500">Name (optional)</span>
              <input
                type="text"
                disabled={disabled || setupRequired}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-0.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex-1 min-w-[140px]">
              <span className="text-[10px] font-semibold uppercase text-gray-500">WhatsApp (optional)</span>
              <input
                type="tel"
                disabled={disabled || setupRequired}
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="254712345678"
                className="mt-0.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={notifySignOut}
                disabled={disabled || setupRequired}
                onChange={(e) => setNotifySignOut(e.target.checked)}
              />
              Also notify on sign-out
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={notifyWhatsapp}
                disabled={disabled || setupRequired}
                onChange={(e) => setNotifyWhatsapp(e.target.checked)}
              />
              Send WhatsApp when number is set
            </label>
            <button
              type="submit"
              disabled={disabled || setupRequired || saving}
              className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Add recipient
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
