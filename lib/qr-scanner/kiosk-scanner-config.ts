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

export function buildKioskScannerConfig(
  element: HTMLElement,
  options?: { facing?: KioskCameraFacing }
) {
  const isDesktop = isDesktopScannerDevice();
  const facing = options?.facing ?? defaultKioskCameraFacing();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const viewH = element.clientHeight || Math.floor(vh * (isDesktop ? 0.5 : 0.75));
  const scanSize = Math.floor(Math.min(vw, viewH) * (isDesktop ? 0.62 : 0.78));
  const qrbox = isDesktop
    ? Math.max(180, Math.min(scanSize, 280))
    : Math.max(240, Math.min(scanSize, 400));

  return {
    config: {
      fps: isDesktop ? 30 : 20,
      qrbox: { width: qrbox, height: qrbox },
      aspectRatio: 1,
      disableFlip: isDesktop,
      videoConstraints: {
        facingMode: { ideal: facing },
        width: { ideal: isDesktop ? 640 : 1280 },
        height: { ideal: isDesktop ? 480 : 720 },
      } as MediaTrackConstraints,
    },
    constraintsToTry: buildCameraConstraints(facing, isDesktop),
    isDesktop,
  };
}

function buildCameraConstraints(
  facing: KioskCameraFacing,
  isDesktop: boolean
): MediaTrackConstraints[] {
  if (isDesktop) {
    return [
      { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      { facingMode: "user" },
      {},
    ];
  }

  if (facing === "environment") {
    return [
      { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      { facingMode: "environment" },
    ];
  }

  return [
    { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
    { facingMode: "user" },
  ];
}
