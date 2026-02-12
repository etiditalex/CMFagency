"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Inbox,
  Mail,
  Phone,
  Check,
  CheckCheck,
  RefreshCw,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";

type Inquiry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: "new" | "read" | "replied";
  source: string;
  created_at: string;
};

const WHATSAPP_NUMBER = "254797777347";

export default function DashboardInquiriesPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin } = usePortal();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "new" | "read" | "replied">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadInquiries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("inquiries")
        .select("id,name,email,phone,subject,message,status,source,created_at")
        .order("created_at", { ascending: false });

      if (fetchErr) throw fetchErr;
      setInquiries((data as Inquiry[]) ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load inquiries";
      const isMissingTable =
        typeof msg === "string" &&
        (msg.includes("does not exist") || msg.includes("42P01"));
      setError(
        isMissingTable
          ? "Inquiries table not set up. Run database/ticketing_voting_mvp_patch_09_inquiries.sql in Supabase SQL Editor."
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
    loadInquiries();
  }, [
    authLoading,
    isAuthenticated,
    isAdmin,
    isPortalMember,
    portalLoading,
    loadInquiries,
    router,
    user,
  ]);

  const updateStatus = async (id: string, status: "read" | "replied") => {
    setUpdatingId(id);
    try {
      const { error: updateErr } = await supabase
        .from("inquiries")
        .update({ status })
        .eq("id", id);

      if (updateErr) throw updateErr;
      setInquiries((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status } : i))
      );
    } catch (e: unknown) {
      console.error("Failed to update status:", e);
    } finally {
      setUpdatingId(null);
    }
  };

  const openWhatsApp = (inquiry: Inquiry) => {
    const text = `Hi ${inquiry.name},\n\nThank you for your inquiry regarding "${inquiry.subject}". We've received your message and will get back to you shortly.\n\nBest regards,\nCMF Agency`;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const filteredInquiries = inquiries.filter((i) =>
    statusFilter === "all" ? true : i.status === statusFilter
  );

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusBadge = (status: Inquiry["status"]) => {
    const styles: Record<Inquiry["status"], string> = {
      new: "bg-amber-100 text-amber-800 border-amber-200",
      read: "bg-slate-100 text-slate-700 border-slate-200",
      replied: "bg-green-100 text-green-800 border-green-200",
    };
    const labels: Record<Inquiry["status"], string> = {
      new: "New",
      read: "Read",
      replied: "Replied",
    };
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  if (authLoading || portalLoading) return null;
  if (!isAuthenticated || !user || !isPortalMember || !isAdmin) return null;

  return (
    <div className="text-left">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">
            Inquiries
          </h2>
          <p className="mt-1 text-gray-600 max-w-3xl">
            Customer inquiries from the contact form. Saved to the dashboard and
            sent to WhatsApp.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadInquiries()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as typeof statusFilter)
            }
            className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700"
          >
            <option value="all">All</option>
            <option value="new">New</option>
            <option value="read">Read</option>
            <option value="replied">Replied</option>
          </select>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <Inbox className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Loading inquiries...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-600 font-medium">{error}</p>
            <button
              type="button"
              onClick={() => loadInquiries()}
              className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-md border border-red-300 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>
          </div>
        ) : filteredInquiries.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Inbox className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No inquiries yet</p>
            <p className="mt-1 text-sm">
              Inquiries from the contact form will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredInquiries.map((inquiry) => (
              <div
                key={inquiry.id}
                className="p-4 sm:p-5 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {inquiry.name}
                      </h3>
                      {statusBadge(inquiry.status)}
                      <span className="text-xs text-gray-500">
                        {formatDate(inquiry.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 font-medium text-gray-700">
                      {inquiry.subject}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {inquiry.email}
                      </span>
                      {inquiry.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {inquiry.phone}
                        </span>
                      )}
                    </div>
                    {(expandedId === inquiry.id || inquiry.message.length < 150) && (
                      <p className="mt-3 text-gray-600 whitespace-pre-wrap">
                        {inquiry.message}
                      </p>
                    )}
                    {inquiry.message.length >= 150 && expandedId !== inquiry.id && (
                      <button
                        type="button"
                        onClick={() => setExpandedId(inquiry.id)}
                        className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Show full message
                      </button>
                    )}
                    {expandedId === inquiry.id && inquiry.message.length >= 150 && (
                      <button
                        type="button"
                        onClick={() => setExpandedId(null)}
                        className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Collapse
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openWhatsApp(inquiry)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Reply via WhatsApp
                    </button>
                    {inquiry.status === "new" && (
                      <button
                        type="button"
                        onClick={() => updateStatus(inquiry.id, "read")}
                        disabled={updatingId === inquiry.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                      >
                        <Check className="w-4 h-4" />
                        Mark read
                      </button>
                    )}
                    {(inquiry.status === "new" || inquiry.status === "read") && (
                      <button
                        type="button"
                        onClick={() => updateStatus(inquiry.id, "replied")}
                        disabled={updatingId === inquiry.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-green-300 bg-green-50 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-60"
                      >
                        <CheckCheck className="w-4 h-4" />
                        Mark replied
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
