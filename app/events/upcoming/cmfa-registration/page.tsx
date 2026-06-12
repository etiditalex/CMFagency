"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, ChevronLeft, MapPin, Send, UserPlus } from "lucide-react";
import { format } from "date-fns";

import { CMFA_DESIGNATIONS } from "@/lib/cmfa-registration";

const EVENT = {
  title: "Coast Fashion and Modelling Awards 2026 (CMFA)",
  date: "2026-08-15",
  time: "6:50 PM",
  location: "Mombasa, Kenya",
};

export default function CmfaRegistrationPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const showGuestFields = designation === "cmf_executive";
  const eventDateLabel = format(new Date(EVENT.date), "EEEE, MMMM d, yyyy");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !designation) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        designation,
      };

      if (showGuestFields && (guestName.trim() || guestEmail.trim() || guestPhone.trim())) {
        payload.guest = {
          name: guestName.trim(),
          email: guestEmail.trim(),
          phone: guestPhone.trim() || undefined,
        };
      }

      const res = await fetch("/api/cmfa/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Registration failed.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="container-custom max-w-xl py-8">
        <Link
          href="/events/upcoming"
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-6 font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Upcoming Events
        </Link>

        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">CMFA Registration</h1>
        <p className="text-gray-600 mb-6">
          Register for complimentary in-house attendance at the Coast Fashion and Modelling Awards. After approval,
          you will receive a ticket with a QR code by email to show at the gate.
        </p>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Event</div>
          <div className="text-lg font-bold text-gray-900">{EVENT.title}</div>
          <div className="flex flex-wrap gap-3 text-sm text-gray-700 mt-2">
            <span className="inline-flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary-600" />
              {eventDateLabel} · {EVENT.time}
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary-600" />
              {EVENT.location}
            </span>
          </div>
        </div>

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <p className="font-semibold text-green-800">Registration submitted</p>
            <p className="text-green-700 text-sm mt-2">
              Your registration is pending approval. Once approved by the CMF team, you
              {showGuestFields && guestEmail.trim() ? " and your guest" : ""} will receive complimentary tickets with
              QR codes by email.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone number *</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Designation / Role *</label>
              <select
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white"
              >
                <option value="">Select your role</option>
                {CMFA_DESIGNATIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                All roles receive a complimentary ticket after approval.
              </p>
            </div>

            {showGuestFields && (
              <div className="rounded-lg border border-primary-200 bg-primary-50/50 p-4 space-y-4">
                <div className="flex items-center gap-2 text-primary-800 font-semibold text-sm">
                  <UserPlus className="w-4 h-4" />
                  Complimentary guest ticket (optional)
                </div>
                <p className="text-xs text-gray-600">
                  CMF Executive members may register one person accompanying them. They will receive their own
                  complimentary ticket after approval.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Guest full name</label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Guest email</label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Guest phone number</label>
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 text-sm ${
                submitting ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              {submitting ? "Submitting…" : "Submit registration"}
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
