export type BrowserPosition = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
};

type GeoOptions = {
  timeoutMs?: number;
  maximumAge?: number;
};

function readPosition(pos: GeolocationPosition): BrowserPosition {
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracyMeters: pos.coords.accuracy,
  };
}

function geolocationErrorMessage(err: GeolocationPositionError): string {
  if (err.code === err.PERMISSION_DENIED) {
    return "Location permission is required. In your browser, allow location for this site (not only the phone's main Location switch). On iPhone: Settings → Safari → Location, or tap the address bar lock icon.";
  }
  if (err.code === err.TIMEOUT) {
    return "Could not get your location in time. Try again near a window or wait a few seconds after starting the camera.";
  }
  if (err.code === err.POSITION_UNAVAILABLE) {
    return "Location is unavailable on this device right now. Move closer to a window or try again.";
  }
  return "Could not read your GPS location. Try again.";
}

function requestPosition(opts: PositionOptions): Promise<BrowserPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("This device does not support location services."));
      return;
    }

    let settled = false;
    let watchId: number | null = null;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      fn();
    };

    const onSuccess = (pos: GeolocationPosition) => {
      finish(() => resolve(readPosition(pos)));
    };

    const onError = (err: GeolocationPositionError) => {
      finish(() => reject(new Error(geolocationErrorMessage(err))));
    };

    const hardTimeout = window.setTimeout(() => {
      finish(() =>
        reject(
          new Error(
            "Could not get your location in time. Enable GPS, move near a window, and try again."
          )
        )
      );
    }, (opts.timeout ?? 20000) + 2000);

    const clearHardTimeout = () => window.clearTimeout(hardTimeout);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearHardTimeout();
        onSuccess(pos);
      },
      () => {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            clearHardTimeout();
            onSuccess(pos);
          },
          (err) => {
            clearHardTimeout();
            onError(err);
          },
          opts
        );
      },
      opts
    );
  });
}

/** High-accuracy fix; falls back to cached / network location when GPS times out (better indoors). */
export async function getBrowserPosition(options?: GeoOptions): Promise<BrowserPosition> {
  const timeoutMs = options?.timeoutMs ?? 20000;
  const maximumAge = options?.maximumAge ?? 0;

  try {
    return await requestPosition({
      enableHighAccuracy: true,
      timeout: timeoutMs,
      maximumAge,
    });
  } catch (highAccErr) {
    const msg = highAccErr instanceof Error ? highAccErr.message : "";
    const retryable =
      msg.includes("in time") ||
      msg.includes("TIMEOUT") ||
      msg.includes("unavailable") ||
      msg.includes("Could not read");

    if (!retryable || msg.includes("permission")) {
      throw highAccErr;
    }

    return requestPosition({
      enableHighAccuracy: false,
      timeout: Math.min(timeoutMs, 12000),
      maximumAge: Math.max(maximumAge, 120_000),
    });
  }
}
