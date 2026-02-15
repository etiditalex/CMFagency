"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, User, Bot, Loader2 } from "lucide-react";

function generateSessionId() {
  if (typeof window !== "undefined" && window.localStorage) {
    let id = window.localStorage.getItem("changer_session_id");
    if (!id) {
      id = `ch_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      window.localStorage.setItem("changer_session_id", id);
    }
    return id;
  }
  return `ch_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

type Message = {
  id: string;
  role: "user" | "assistant" | "live_agent";
  content: string;
  created_at?: string;
};

type InquiryType = "support" | "billing" | "technical";

export default function ChangerWidget() {
  const [open, setOpen] = useState(false);
  const [intakeComplete, setIntakeComplete] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [handoffRequested, setHandoffRequested] = useState(false);
  const [liveAgentName, setLiveAgentName] = useState<string | null>(null);
  const [visitorName, setVisitorName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [visitorContact, setVisitorContact] = useState("");
  const [inquiryType, setInquiryType] = useState<InquiryType>("support");
  const sessionId = useRef(generateSessionId());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const loadConversation = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/changer/conversation?sessionId=${encodeURIComponent(sessionId.current)}`
      );
      const data = await res.json();
      if (data.conversation) {
        setMessages(
          (data.messages ?? []).map((m: { id: string; role: string; content: string; created_at?: string }) => ({
            id: m.id,
            role: m.role as "user" | "assistant" | "live_agent",
            content: m.content,
            created_at: m.created_at,
          }))
        );
        if (data.conversation.status === "waiting_for_agent") {
          setHandoffRequested(true);
        }
        if (data.conversation.status === "live_agent" && data.conversation.live_agent_name) {
          setLiveAgentName(data.conversation.live_agent_name);
          setHandoffRequested(false);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadConversation();
      pollRef.current = setInterval(loadConversation, 3000);
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [open, loadConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content: text },
    ]);
    setLoading(true);
    try {
      const res = await fetch("/api/changer/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId.current,
          message: text,
          visitorName: visitorName || undefined,
          visitorEmail: visitorEmail || undefined,
          visitorContact: visitorContact || undefined,
          inquiryType: inquiryType || undefined,
        }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: (data.role as "assistant" | "live_agent") || "assistant",
            content: data.message,
          },
        ]);
        if (data.handoffTriggered) {
          setHandoffRequested(true);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const submitIntake = () => {
    if (!visitorName.trim() || !visitorEmail.trim() || !visitorContact.trim()) return;
    setIntakeComplete(true);
  };

  const requestLiveAgent = async () => {
    if (handoffRequested || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/changer/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId.current,
          visitorName: visitorName || undefined,
          visitorEmail: visitorEmail || undefined,
          visitorContact: visitorContact || undefined,
          inquiryType: inquiryType || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setHandoffRequested(true);
        setMessages((prev) => [
          ...prev,
          {
            id: `h-${Date.now()}`,
            role: "assistant",
            content: data.message || "A live agent has been notified. Alex will join your conversation shortly. We've also sent an email to our team.",
          },
        ]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.div
        className="fixed right-6 bottom-6 z-40"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 1 }}
      >
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close Changer chat" : "Open Changer chat"}
          className="group relative block"
        >
          <motion.div
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="w-14 h-14 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
          >
            <MessageCircle className="w-7 h-7 text-white" />
          </motion.div>
        </button>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed right-6 bottom-20 w-[380px] max-w-[calc(100vw-3rem)] h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-primary-600 to-secondary-600 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-white" />
                <span className="font-bold text-white">Changer</span>
                {liveAgentName && (
                  <span className="text-xs bg-white/25 px-2 py-0.5 rounded">
                    {liveAgentName} is here
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {liveAgentName && (
              <div className="bg-green-50 border-b border-green-200 px-3 py-2 text-sm text-green-800">
                {liveAgentName} has joined the conversation. You can continue chatting below.
              </div>
            )}

            {!intakeComplete ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <p className="text-sm text-gray-600">Please tell us a bit about you before we start:</p>
                <input
                  type="text"
                  placeholder="Name *"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <input
                  type="email"
                  placeholder="Email *"
                  value={visitorEmail}
                  onChange={(e) => setVisitorEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <input
                  type="tel"
                  placeholder="Contact / Phone *"
                  value={visitorContact}
                  onChange={(e) => setVisitorContact(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <div>
                  <p className="text-sm text-gray-600 mb-2">I am looking for:</p>
                  <select
                    value={inquiryType}
                    onChange={(e) => setInquiryType(e.target.value as InquiryType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="support">Support</option>
                    <option value="billing">Billing</option>
                    <option value="technical">Technical</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={submitIntake}
                  disabled={!visitorName.trim() || !visitorEmail.trim() || !visitorContact.trim()}
                  className="w-full px-4 py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start Chat
                </button>
              </div>
            ) : (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 && !loading && (
                <div className="text-center text-gray-500 text-sm py-8">
                  <p className="font-medium">Hi! I&apos;m Changer.</p>
                  <p className="mt-1">Ask me anything about CMF Agency.</p>
                  <p className="mt-2 text-xs">Need a human? Request a live agent.</p>
                </div>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role !== "user" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                      {m.role === "live_agent" ? (
                        <User className="w-4 h-4 text-primary-600" />
                      ) : (
                        <Bot className="w-4 h-4 text-primary-600" />
                      )}
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">
                      {m.content.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                        part.match(/^https?:\/\//) ? (
                          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className={`underline font-medium ${m.role === "user" ? "text-white/95 hover:text-white" : "text-primary-600 hover:text-primary-700"}`}>
                            {part}
                          </a>
                        ) : (
                          part
                        )
                      )}
                    </p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2 justify-start">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <Loader2 className="w-4 h-4 text-primary-600 animate-spin" />
                  </div>
                  <div className="bg-gray-100 rounded-xl px-3 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            )}

            {intakeComplete && (
              <div className="p-3 border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                {!handoffRequested && !liveAgentName && (
                  <button
                    type="button"
                    onClick={requestLiveAgent}
                    className="mt-2 w-full text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Talk to a live agent (Alex)
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
