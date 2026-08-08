/** Phone / tablet / laptop-desktop webcam kiosks. */
export type ScannerDeviceClass = "phone" | "tablet" | "desktop";

/**
 * Classify the device for camera + decode tuning.
 * Android tablets must not be treated as desktop webcams (rear camera + native detector).
 */
export function getScannerDeviceClass(): ScannerDeviceClass {
  if (typeof window === "undefined") return "desktop";

  const ua = navigator.userAgent;

  if (/iPhone|iPod/i.test(ua)) return "phone";
  if (/iPad/i.test(ua)) return "tablet";
  // iPadOS 13+ reports as Macintosh with touch.
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return "tablet";

  if (/Android/i.test(ua)) {
    // Android phones include "Mobile"; tablets usually do not.
    return /Mobile/i.test(ua) ? "phone" : "tablet";
  }

  if (/webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return "phone";

  // Touch-first large screens that report a desktop UA (many Android kiosk tablets).
  if (navigator.maxTouchPoints > 1) {
    const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
    const noHover = window.matchMedia?.("(hover: none)")?.matches;
    if (coarse || noHover) return "tablet";
  }

  return "desktop";
}

/** Laptop/desktop webcam kiosks vs phones/tablets (touch-first). */
export function isDesktopScannerDevice(): boolean {
  return getScannerDeviceClass() === "desktop";
}

export type KioskCameraFacing = "environment" | "user";

export function defaultKioskCameraFacing(): KioskCameraFacing {
  return isDesktopScannerDevice() ? "user" : "environment";
}

export type KioskScannerRuntimeConfig = {
  fps: number;
  qrbox:
    | number
    | { width: number; height: number }
    | ((viewfinderWidth: number, viewfinderHeight: number) => { width: number; height: number });
  aspectRatio?: number;
  disableFlip?: boolean;
  videoConstraints?: MediaTrackConstraints;
};

const LAST_CAMERA_KEY = "cmf-qr-last-camera-v1";

type LastCameraMemory = {
  facing: KioskCameraFacing;
  deviceId?: string;
  constraints?: MediaTrackConstraints;
};

function readLastCamera(facing: KioskCameraFacing): LastCameraMemory | null {
  try {
    const raw = sessionStorage.getItem(LAST_CAMERA_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastCameraMemory;
    if (parsed?.facing !== facing) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Persist the working camera so the next Start skips failed constraint cascades. */
export function rememberSuccessfulCamera(
  facing: KioskCameraFacing,
  cameraIdOrConstraints: string | MediaTrackConstraints
): void {
  try {
    const payload: LastCameraMemory =
      typeof cameraIdOrConstraints === "string"
        ? { facing, deviceId: cameraIdOrConstraints }
        : { facing, constraints: cameraIdOrConstraints };
    sessionStorage.setItem(LAST_CAMERA_KEY, JSON.stringify(payload));
  } catch {
    /* private mode / storage blocked */
  }
}

function kioskQrboxSize(
  viewfinderWidth: number,
  viewfinderHeight: number,
  deviceClass: ScannerDeviceClass
): { width: number; height: number } {
  const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
  // Larger crop = more QR pixels for the decoder (faster lock at typical hold distance).
  const ratio = deviceClass === "desktop" ? 0.88 : deviceClass === "tablet" ? 0.84 : 0.8;
  const minSize = deviceClass === "desktop" ? 220 : deviceClass === "tablet" ? 260 : 240;
  const maxSize = deviceClass === "phone" ? 420 : deviceClass === "tablet" ? 520 : 640;
  const size = Math.min(maxSize, Math.max(minSize, Math.floor(minEdge * ratio)));
  return { width: size, height: size };
}

/** Target decode cadence — higher FPS shortens time-to-first-lock. */
function targetFps(deviceClass: ScannerDeviceClass): number {
  if (deviceClass === "desktop") return 24;
  if (deviceClass === "tablet") return 30;
  return 30;
}

function idealCaptureSize(deviceClass: ScannerDeviceClass): {
  width: number;
  height: number;
} {
  // 720p keeps QR detail high enough for handheld codes without the CPU cost of 1080p.
  if (deviceClass === "phone") return { width: 1280, height: 720 };
  if (deviceClass === "tablet") return { width: 1280, height: 720 };
  return { width: 1280, height: 720 };
}

/**
 * Prefer native BarcodeDetector (~2× faster than ZXing).
 * html5-qrcode falls back to JS decode automatically when unsupported.
 */
export function useNativeBarcodeDetectorOnDevice(): boolean {
  return true;
}

function baseVideoConstraints(
  facing: KioskCameraFacing,
  deviceClass: ScannerDeviceClass
): MediaTrackConstraints {
  const size = idealCaptureSize(deviceClass);
  const constraints: MediaTrackConstraints = {
    facingMode: { ideal: facing },
    width: { ideal: size.width },
    height: { ideal: size.height },
    frameRate: { ideal: deviceClass === "desktop" ? 24 : 30, max: 30 },
  };

  // Continuous autofocus dramatically speeds lock on phones/tablets when supported.
  if (deviceClass !== "desktop") {
    Object.assign(constraints, {
      // Non-standard but widely honored on Chromium Android / some WebKit builds.
      focusMode: "continuous",
    } as MediaTrackConstraints);
  }

  return constraints;
}

export function buildKioskScannerRuntimeConfig(
  element: HTMLElement,
  options?: { facing?: KioskCameraFacing }
): { config: KioskScannerRuntimeConfig; isDesktop: boolean; deviceClass: ScannerDeviceClass } {
  const deviceClass = getScannerDeviceClass();
  const isDesktop = deviceClass === "desktop";
  const facing = options?.facing ?? defaultKioskCameraFacing();
  const fps = targetFps(deviceClass);

  if (isDesktop) {
    return {
      isDesktop,
      deviceClass,
      config: {
        fps,
        qrbox: (viewfinderWidth, viewfinderHeight) =>
          kioskQrboxSize(viewfinderWidth, viewfinderHeight, "desktop"),
        // Webcam feed is not mirrored for kiosk hold-up scans — skip flip decode pass.
        disableFlip: true,
        videoConstraints: baseVideoConstraints("user", "desktop"),
      },
    };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const viewH = element.clientHeight || Math.floor(vh * 0.75);
  const scanSize = Math.floor(Math.min(vw, Math.max(viewH, 280)) * (deviceClass === "tablet" ? 0.84 : 0.8));
  const qrbox = Math.max(deviceClass === "tablet" ? 260 : 240, Math.min(scanSize, deviceClass === "tablet" ? 520 : 420));

  return {
    isDesktop,
    deviceClass,
    config: {
      fps,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const dynamic = kioskQrboxSize(viewfinderWidth, viewfinderHeight, deviceClass);
        const fallback = { width: qrbox, height: qrbox };
        return dynamic.width >= 200 ? dynamic : fallback;
      },
      aspectRatio: 1,
      disableFlip: false,
      videoConstraints: baseVideoConstraints(facing, deviceClass),
    },
  };
}

/** Shared Gate / handheld scanner config (rear camera preferred). */
export function buildHandheldScannerRuntimeConfig(element: HTMLElement): {
  config: KioskScannerRuntimeConfig;
  deviceClass: ScannerDeviceClass;
} {
  const { config, deviceClass } = buildKioskScannerRuntimeConfig(element, {
    facing: "environment",
  });
  return { config, deviceClass };
}

/** Camera inputs to try with html5-qrcode — remembered device first, then best constraints. */
export async function buildKioskCameraStartAttempts(
  facing: KioskCameraFacing
): Promise<Array<string | MediaTrackConstraints>> {
  const deviceClass = getScannerDeviceClass();
  const size = idealCaptureSize(deviceClass);
  const attempts: Array<string | MediaTrackConstraints> = [];

  const remembered = readLastCamera(facing);
  if (remembered?.deviceId) attempts.push(remembered.deviceId);
  if (remembered?.constraints) attempts.push(remembered.constraints);

  if (deviceClass === "desktop") {
    // Loose-first: desktop browsers often reject tight facingMode + resolution combos.
    attempts.push(
      {},
      { facingMode: "user" },
      { facingMode: { ideal: "user" }, frameRate: { ideal: 24 } },
      {
        facingMode: "user",
        width: { ideal: size.width },
        height: { ideal: size.height },
        frameRate: { ideal: 24 },
      }
    );
  } else {
    const preferred = baseVideoConstraints(facing, deviceClass);
    const alternate: KioskCameraFacing = facing === "environment" ? "user" : "environment";
    attempts.push(
      preferred,
      { facingMode: facing, width: { ideal: size.width }, height: { ideal: size.height } },
      { facingMode: facing },
      { facingMode: { ideal: facing } },
      { facingMode: alternate },
      {}
    );
  }

  try {
    const { Html5Qrcode } = await import("html5-qrcode");
    const cameras = await Html5Qrcode.getCameras();
    const ranked = rankCamerasForFacing(cameras, facing);
    for (const camera of ranked) {
      if (camera.id) attempts.push(camera.id);
    }
  } catch {
    /* getCameras needs permission on some browsers — constraint fallbacks above still apply */
  }

  return dedupeAttempts(attempts);
}

type CameraDevice = { id: string; label: string };

/** Prefer rear/front cameras that match the requested facing when labels are available. */
function rankCamerasForFacing(
  cameras: CameraDevice[],
  facing: KioskCameraFacing
): CameraDevice[] {
  const rearHint = /back|rear|environment|world/i;
  const frontHint = /front|user|face|selfie/i;

  return [...cameras].sort((a, b) => {
    const aLabel = a.label || "";
    const bLabel = b.label || "";
    const aScore =
      facing === "environment"
        ? (rearHint.test(aLabel) ? 2 : 0) - (frontHint.test(aLabel) ? 1 : 0)
        : (frontHint.test(aLabel) ? 2 : 0) - (rearHint.test(aLabel) ? 1 : 0);
    const bScore =
      facing === "environment"
        ? (rearHint.test(bLabel) ? 2 : 0) - (frontHint.test(bLabel) ? 1 : 0)
        : (frontHint.test(bLabel) ? 2 : 0) - (rearHint.test(bLabel) ? 1 : 0);
    return bScore - aScore;
  });
}

function dedupeAttempts(attempts: Array<string | MediaTrackConstraints>) {
  const seen = new Set<string>();
  const out: Array<string | MediaTrackConstraints> = [];
  for (const attempt of attempts) {
    const key = typeof attempt === "string" ? `id:${attempt}` : JSON.stringify(attempt);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(attempt);
  }
  return out;
}

export function formatKioskCameraStartError(
  err: unknown,
  facing: KioskCameraFacing
): string {
  const isDesktop = isDesktopScannerDevice();
  const name = err instanceof DOMException ? err.name : err instanceof Error ? err.name : "";
  const message = err instanceof Error ? err.message : String(err ?? "");

  if (name === "NotAllowedError" || /permission/i.test(message)) {
    return "Camera permission denied. Open your browser site settings, allow Camera for this site, reload the page, then tap Start camera again.";
  }
  if (name === "NotFoundError" || /not found|no device/i.test(message)) {
    return isDesktop
      ? "No webcam found. Connect a camera or check that it is not in use by another app."
      : "No camera found on this device.";
  }
  if (name === "NotReadableError" || /in use|busy/i.test(message)) {
    return "Camera is in use by another app. Close other apps using the camera and try again.";
  }
  if (name === "OverconstrainedError") {
    return isDesktop
      ? "Could not open webcam with the requested settings. Try Flip camera or reload the page."
      : facing === "environment"
        ? "Could not open back camera. Tap Flip to try the front camera."
        : "Could not open front camera. Tap Flip to try the back camera.";
  }
  if (/secure context|https/i.test(message)) {
    return "Camera only works on HTTPS (or localhost).";
  }

  return isDesktop
    ? "Could not open webcam. Allow camera access, reload the page, and try again."
    : facing === "environment"
      ? "Could not open back camera. Try Flip to switch cameras."
      : "Could not open front camera. Try Flip to switch cameras.";
}

const WARMUP_RELEASE_DELAY_MS = 120;

/** Optional warm-up permission request — helps getCameras() return device ids on desktop. */
export async function warmupCameraPermission(): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });
  } catch {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } catch {
      /* launchScanner will surface the real error */
    }
  } finally {
    stream?.getTracks().forEach((track) => track.stop());
    if (isDesktopScannerDevice()) {
      await new Promise((r) => setTimeout(r, WARMUP_RELEASE_DELAY_MS));
    }
  }
}

type FocusCapableScanner = {
  applyVideoConstraints?: (constraints: MediaTrackConstraints) => Promise<void>;
  getRunningTrackCapabilities?: () => MediaTrackCapabilities;
  getRunningTrackSettings?: () => MediaTrackSettings;
};

/**
 * After the stream is live, push continuous autofocus + frame rate when the track allows it.
 * This is the biggest real-world speed win on phone/tablet rear cameras.
 */
export async function reinforceLiveCameraTrack(scanner: FocusCapableScanner | null | undefined): Promise<void> {
  if (!scanner?.applyVideoConstraints) return;

  const deviceClass = getScannerDeviceClass();
  const desiredFps = deviceClass === "desktop" ? 24 : 30;

  try {
    const caps = scanner.getRunningTrackCapabilities?.() as
      | (MediaTrackCapabilities & { focusMode?: string[]; torch?: boolean })
      | undefined;

    const next: MediaTrackConstraints = {
      frameRate: { ideal: desiredFps },
    };

    if (caps && Array.isArray(caps.focusMode) && caps.focusMode.includes("continuous")) {
      Object.assign(next, { focusMode: "continuous" } as MediaTrackConstraints);
    } else if (deviceClass !== "desktop") {
      // Still request; browsers that ignore unknown keys keep the current track.
      Object.assign(next, { focusMode: "continuous" } as MediaTrackConstraints);
    }

    await scanner.applyVideoConstraints(next);
  } catch {
    /* capability not supported — scanning still works with defaults */
  }
}
