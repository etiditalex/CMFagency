"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MapPin, RefreshCw } from "lucide-react";

import { supabase } from "@/lib/supabase";

type OrgLocation = {
  latitude: number;
  longitude: number;
  geofenceRadiusM: number;
  addressLine1: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  geocodedAt: string;
};

type Props = {
  businessName?: string;
};

export default function WorkplaceLocationPanel({ businessName }: Props) {
  const [location, setLocation] = useState<OrgLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [radius, setRadius] = useState(150);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/visitor-management/org-location", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        location?: OrgLocation | null;
        error?: string;
        setupRequired?: boolean;
        message?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Could not load workplace location");
      if (json.setupRequired) {
        setError(json.message ?? "Run visitor_management_patch_06_gps_tracking.sql in Supabase.");
        setLocation(null);
        return;
      }
      if (json.location) {
        setLocation(json.location);
        setRadius(json.location.geofenceRadiusM ?? 150);
      } else {
        setLocation(null);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const geocodeFromSignupAddress = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const user = sessionData.session?.user;
      if (!token || !user) throw new Error("Not signed in");

      const meta = user.user_metadata ?? {};
      const res = await fetch("/api/visitor-management/org-location", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          regeocode: true,
          geofenceRadiusM: radius,
          addressLine1: String(meta.address_line_1 ?? ""),
          addressLine2: String(meta.address_line_2 ?? ""),
          suburb: String(meta.suburb ?? ""),
          state: String(meta.state ?? ""),
          postcode: String(meta.postcode ?? ""),
          country: String(meta.country ?? ""),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        location?: OrgLocation;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Geocode failed");
      if (json.location) setLocation(json.location);
      setMessage("Workplace location saved from your registered business address.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not geocode address");
    } finally {
      setSaving(false);
    }
  };

  const useCurrentDeviceLocation = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const { getBrowserPosition } = await import("@/lib/employees/browser-geolocation");
      const pos = await getBrowserPosition();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const user = sessionData.session?.user;
      if (!token) throw new Error("Not signed in");
      const meta = user?.user_metadata ?? {};

      const res = await fetch("/api/visitor-management/org-location", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latitude: pos.latitude,
          longitude: pos.longitude,
          geofenceRadiusM: radius,
          addressLine1: String(meta.address_line_1 ?? businessName ?? "Workplace"),
          suburb: String(meta.suburb ?? ""),
          state: String(meta.state ?? ""),
          postcode: String(meta.postcode ?? ""),
          country: String(meta.country ?? ""),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        location?: OrgLocation;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Could not save location");
      if (json.location) setLocation(json.location);
      setMessage("Workplace pin set to your current GPS position (use while at reception).");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not get location");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <MapPin className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
        <div>
          <h2 className="text-sm font-bold text-gray-900">GPS tracking (workplace)</h2>
          <p className="text-xs text-gray-600 mt-1">
            Staff and CRM must be within this area to sign in or out. Set this pin while standing at reception.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-red-800 rounded-lg border border-red-200 bg-red-50 px-3 py-2">{error}</p>
      ) : null}
      {message ? (
        <p className="text-sm text-emerald-900 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          {message}
        </p>
      ) : null}

      {location ? (
        <div className="text-sm text-gray-800 space-y-1 rounded-lg bg-white border border-sky-100 px-3 py-2">
          <p>
            <span className="font-semibold">Coordinates:</span> {location.latitude.toFixed(5)},{" "}
            {location.longitude.toFixed(5)}
          </p>
          <p>
            <span className="font-semibold">Address:</span>{" "}
            {[location.addressLine1, location.suburb, location.state, location.postcode, location.country]
              .filter(Boolean)
              .join(", ")}
          </p>
          <p className="text-xs text-gray-500">
            Last updated {new Date(location.geocodedAt).toLocaleString()}
          </p>
        </div>
      ) : (
        <p className="text-sm text-amber-900 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          No workplace GPS set yet. Geocode your signup address or set a pin while standing at reception.
        </p>
      )}

      <label className="block text-xs font-semibold text-gray-700">
        Allowed distance (metres)
        <input
          type="number"
          min={25}
          max={2000}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value) || 150)}
          className="mt-1 w-full max-w-[120px] rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void geocodeFromSignupAddress()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-white px-3 py-2 text-xs font-bold text-sky-900 hover:bg-sky-50 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Geocode signup address
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void useCurrentDeviceLocation()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-2 text-xs font-bold text-white hover:bg-sky-800 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
          Set pin to this device
        </button>
      </div>
    </section>
  );
}
