import {
  browserDeviceLabel,
  normalizeDeviceFingerprint,
  type DeviceFingerprintInput,
} from "@/lib/employees/device-fingerprint";

export const VISITOR_DEVICE_STORAGE_KEY = "fx_visitor_device_id";

export function getOrCreateVisitorDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(VISITOR_DEVICE_STORAGE_KEY);
    if (existing && existing.length >= 8) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `vdev_${crypto.randomUUID()}`
        : `vdev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(VISITOR_DEVICE_STORAGE_KEY, id);
    return id;
  } catch {
    return `vdev_${Date.now()}`;
  }
}

export function visitorDeviceLabel(): string {
  return browserDeviceLabel();
}

export function visitorDevicePayload() {
  const deviceId = getOrCreateVisitorDeviceId();
  return {
    deviceId,
    deviceLabel: visitorDeviceLabel(),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    platform: typeof navigator !== "undefined" ? navigator.platform : "",
    language: typeof navigator !== "undefined" ? navigator.language : "",
  };
}

export function normalizeVisitorDevice(input: DeviceFingerprintInput) {
  return normalizeDeviceFingerprint(input);
}
