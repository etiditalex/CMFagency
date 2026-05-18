export type DeviceFingerprintInput = {
  deviceId?: unknown;
  deviceLabel?: unknown;
  userAgent?: unknown;
  platform?: unknown;
  language?: unknown;
};

export type DeviceFingerprint = {
  deviceId: string;
  deviceLabel: string;
  deviceInfo: Record<string, unknown>;
};

export function normalizeDeviceFingerprint(input: DeviceFingerprintInput): DeviceFingerprint {
  const deviceId = String(input.deviceId ?? "")
    .trim()
    .slice(0, 128);
  const deviceLabel = String(input.deviceLabel ?? "")
    .trim()
    .slice(0, 200);
  const userAgent = String(input.userAgent ?? "")
    .trim()
    .slice(0, 500);

  return {
    deviceId: deviceId || "unknown-device",
    deviceLabel: deviceLabel || "Unknown device",
    deviceInfo: {
      userAgent: userAgent || undefined,
      platform: String(input.platform ?? "").trim().slice(0, 80) || undefined,
      language: String(input.language ?? "").trim().slice(0, 40) || undefined,
    },
  };
}

/** Stable id for browser clients (call from client before scan). */
export const EMPLOYEE_DEVICE_STORAGE_KEY = "fx_employee_device_id";

export function getOrCreateBrowserDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(EMPLOYEE_DEVICE_STORAGE_KEY);
    if (existing && existing.length >= 8) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `dev_${crypto.randomUUID()}`
        : `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(EMPLOYEE_DEVICE_STORAGE_KEY, id);
    return id;
  } catch {
    return `dev_${Date.now()}`;
  }
}

export function browserDeviceLabel(): string {
  if (typeof navigator === "undefined") return "Web browser";
  const ua = navigator.userAgent ?? "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS device";
  if (/Android/i.test(ua)) return "Android device";
  if (/Windows/i.test(ua)) return "Windows device";
  if (/Mac OS/i.test(ua)) return "Mac device";
  return "Web browser";
}
