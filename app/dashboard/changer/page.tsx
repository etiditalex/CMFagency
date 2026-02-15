"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MessageCircle,
  RefreshCw,
  User,
  UserPlus,
  Clock,
  CheckCircle,
  Mail,
  BookOpen,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";

type Conversation = {
  id: string;
  session_id: string;
  status: string;
  live_agent_name: string | null;
  live_agent_picked_at: string | null;
  visitor_name: string | null;
  visitor_email: string | null;
  created_at: string;
  updated_at: string;
};

type HandoffLog = {
  id: string;
  conversation_id: string;
  live_agent_name: string;
  picked_at: string;
};

const LIVE_AGENT_NAME = "Alex";

export default function DashboardChangerPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin } = usePortal();

  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [handoffLogs, setHandoffLogs] = useState<HandoffLog[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ role: string; content: string; created_at: string }>>([]);
  const [agentInput, setAgentInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [convRes, logRes] = await Promise.all([
        supabase
          .from("changer_conversations")
          .select("id, session_id, status, live_agent_name, live_agent_picked_at, visitor_name, visitor_email, created_at, updated_at")
          .order("updated_at", { ascending: false })
          .limit(50),
        supabase
          .from("changer_handoff_log")
          .select("id, conversation_id, live_agent_name, picked_at")
          .order("picked_at", { ascending: false })
          .limit(30),
      ]);

      if (convRes.error) throw convRes.error;
      if (logRes.error) throw logRes.error;

      setConversations((convRes.data as Conversation[]) ?? []);
      setHandoffLogs((logRes.data as HandoffLog[]) ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      const isMissing = typeof msg === "string" && (msg.includes("does not exist") || msg.includes("42P01"));
      setError(
        isMissing
          ? "Changer tables not set up. Run database/ticketing_voting_mvp_patch_13_changer.sql in Supabase."
          : msg
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }
    if (!isAdmin) {
      router.replace("/dashboard");
      return;
    }
    loadData();
  }, [authLoading, isAuthenticated, isAdmin, isPortalMember, portalLoading, loadData, router, user]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      const { data, error: msgErr } = await supabase
        .from("changer_messages")
        .select("role, content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (msgErr) return;
      setMessages((data ?? []) as Array<{ role: string; content: string; created_at: string }>);
    },
    []
  );

  useEffect(() => {
    if (selectedId) {
      loadMessages(selectedId);
    } else {
      setMessages([]);
    }
  }, [selectedId, loadMessages]);

  // Poll messages when viewing a live_agent conversation
  const selectedConv = conversations.find((c) => c.id === selectedId);
  useEffect(() => {
    if (!selectedId || selectedConv?.status !== "live_agent") return;
    const t = setInterval(() => loadMessages(selectedId), 2000);
    return () => clearInterval(t);
  }, [selectedId, selectedConv?.status, loadMessages]);

  const sendAgentMessage = async () => {
    const text = agentInput.trim();
    if (!text || !selectedId || sendingMessage) return;
    setSendingMessage(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch("/api/changer/agent-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ conversationId: selectedId, content: text }),
      });
      const data = await res.json();
      if (data.success) {
        setAgentInput("");
        loadMessages(selectedId);
      } else {
        setError(data.error || "Failed to send");
      }
    } catch {
      setError("Failed to send");
    } finally {
      setSendingMessage(false);
    }
  };

  const pickUp = async (conv: Conversation) => {
    if (conv.status === "live_agent") return;
    setPickingId(conv.id);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch("/api/changer/agent-pickup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ conversationId: conv.id }),
      });
      const data = await res.json();
      if (data.success) {
        loadData();
        if (selectedId === conv.id) loadMessages(conv.id);
      } else {
        setError(data.error || "Failed to pick up");
      }
    } catch {
      setError("Failed to pick up");
    } finally {
      setPickingId(null);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString("en-KE", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; class: string }> = {
      bot: { label: "AI", class: "bg-blue-100 text-blue-800 border-blue-200" },
      waiting_for_agent: { label: "Waiting", class: "bg-amber-100 text-amber-800 border-amber-200" },
      live_agent: { label: "Live", class: "bg-green-100 text-green-800 border-green-200" },
      ended: { label: "Ended", class: "bg-gray-100 text-gray-700 border-gray-200" },
    };
    const s = map[status] ?? { label: status, class: "bg-gray-100 text-gray-700" };
    return (
      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${s.class}`}>
        {s.label}
      </span>
    );
  };

  if (authLoading || portalLoading) return null;
  if (!isAuthenticated || !isPortalMember || !isAdmin) return null;

  const selected = conversations.find((c) => c.id === selectedId);

  return (
    <div className="text-left">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">Changer</h2>
          <p className="mt-1 text-gray-600 max-w-3xl">
            AI chatbot conversations. When a visitor requests a live agent, you&apos;ll get an email at changerfusions@gmail.com.
            Click &quot;Pick up&quot; to join as {LIVE_AGENT_NAME}. Handoffs are recorded here.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              setSyncing(true);
              try {
                const token = (await supabase.auth.getSession()).data.session?.access_token;
                const res = await fetch("/api/changer/sync-knowledge", {
                  method: "POST",
                  headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (data.success) {
                  setError(null);
                  if (data.errors?.length) {
                    setError(`Synced ${data.synced}/${data.total}. Issues: ${data.errors.slice(0, 2).join("; ")}`);
                  }
                } else setError(data.error || "Sync failed");
              } catch {
                setError("Sync failed");
              } finally {
                setSyncing(false);
              }
            }}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <BookOpen className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            Sync Knowledge
          </button>
          <button
            type="button"
            onClick={() => loadData()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-900">
            Conversations
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p>No conversations yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                    selectedId === c.id ? "bg-primary-50 border-l-4 border-primary-600" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {statusBadge(c.status)}
                    <span className="text-xs text-gray-500 truncate">
                      {formatDate(c.updated_at)}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-700 truncate">
                    {c.visitor_name || c.visitor_email || c.session_id.slice(0, 12)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-900 flex items-center justify-between">
              <span>Messages</span>
              {selected && selected.status !== "live_agent" && (
                <button
                  type="button"
                  onClick={() => pickUp(selected)}
                  disabled={pickingId === selected.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60"
                >
                  <UserPlus className="w-4 h-4" />
                  Pick up as {LIVE_AGENT_NAME}
                </button>
              )}
            </div>
            {selected ? (
              <div className="p-4">
                <div className="flex gap-4 text-sm text-gray-600 mb-4">
                  {selected.visitor_name && (
                    <span className="inline-flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {selected.visitor_name}
                    </span>
                  )}
                  {selected.visitor_email && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {selected.visitor_email}
                    </span>
                  )}
                  {selected.live_agent_name && (
                    <span className="inline-flex items-center gap-1 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      {selected.live_agent_name} picked up
                    </span>
                  )}
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          m.role === "user"
                            ? "bg-primary-600 text-white ml-auto"
                            : m.role === "live_agent"
                            ? "bg-green-100 text-green-900 border border-green-200"
                            : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <span className="text-xs opacity-75">{m.role === "live_agent" ? LIVE_AGENT_NAME : m.role}</span>
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {selected?.status === "live_agent" && (
                  <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                    <input
                      type="text"
                      value={agentInput}
                      onChange={(e) => setAgentInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendAgentMessage()}
                      placeholder="Type your reply as Alex..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      onClick={sendAgentMessage}
                      disabled={sendingMessage || !agentInput.trim()}
                      className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Select a conversation</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Handoff Log ({LIVE_AGENT_NAME})
            </div>
            <p className="px-4 py-2 text-xs text-gray-500">
              Record of when {LIVE_AGENT_NAME} picked up conversations. Admin dashboard only.
            </p>
            <div className="divide-y divide-gray-100 max-h-[200px] overflow-y-auto">
              {handoffLogs.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">No handoffs yet</div>
              ) : (
                handoffLogs.map((h) => (
                  <div key={h.id} className="px-4 py-2 text-sm text-gray-700">
                    <span className="font-medium">{h.live_agent_name}</span>
                    {" · "}
                    {formatDate(h.picked_at)}
                    {" · "}
                    <span className="text-gray-500">Conv: {h.conversation_id.slice(0, 8)}...</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
