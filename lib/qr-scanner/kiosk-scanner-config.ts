/** Touch-first phones/tablets vs laptop/desktop webcam kiosks. */
export function isDesktopScannerDevice(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(pointer: coarse)").matches) return false;
  return !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

export type KioskCameraFacing = "environment" | "user";

export function defaultKioskCameraFacing(): KioskCameraFacing {
  return isDesktopScannerDevice() ? "user" : "environment";
}

export type KioskScannerRuntimeConfig = {
  fps: number;
  qrbox: { width: number; height: number };
  aspectRatio: number;
  disableFlip: boolean;
};

export function buildKioskScannerRuntimeConfig(
  element: HTMLElement,
  options?: { facing?: KioskCameraFacing }
): { config: KioskScannerRuntimeConfig; isDesktop: boolean } {
  const isDesktop = isDesktopScannerDevice();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const viewH = element.clientHeight || Math.floor(vh * (isDesktop ? 0.5 : 0.75));
  const scanSize = Math.floor(Math.min(vw, Math.max(viewH, 280)) * (isDesktop ? 0.62 : 0.78));
  const qrbox = isDesktop
    ? Math.max(180, Math.min(scanSize, 280))
    : Math.max(240, Math.min(scanSize, 400));

  return {
    isDesktop,
    config: {
      fps: isDesktop ? 30 : 20,
      qrbox: { width: qrbox, height: qrbox },
      aspectRatio: 1,
      disableFlip: isDesktop,
    },
  };
}

/** Camera inputs to try with html5-qrcode — device ids first, then loose constraints. */
export async function buildKioskCameraStartAttempts(
  facing: KioskCameraFacing
): Promise<Array<string | MediaTrackConstraints>> {
  const isDesktop = isDesktopScannerDevice();
  const attempts: Array<string | MediaTrackConstraints> = [];

  try {
    const { Html5Qrcode } = await import("html5-qrcode");
    const cameras = await Html5Qrcode.getCameras();
    for (const camera of cameras) {
      if (camera.id) attempts.push(camera.id);
    }
  } catch {
    /* getCameras needs permission on some browsers — fall through to constraints */
  }

  if (isDesktop) {
    attempts.push(
      { facingMode: "user" },
      { facingMode: "environment" },
      { facingMode: { ideal: "user" } },
      { facingMode: { ideal: "environment" } },
      {}
    );
    return dedupeAttempts(attempts);
  }

  if (facing === "environment") {
    attempts.push(
      { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      { facingMode: "environment" },
      { facingMode: "user" },
      {}
    );
  } else {
    attempts.push(
      { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      { facingMode: "user" },
      { facingMode: "environment" },
      {}
    );
  }

  return dedupeAttempts(attempts);
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
  }
}
