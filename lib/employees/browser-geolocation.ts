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
    return "Location permission is required to sign in or out at your workplace. Enable location for this site in your browser settings.";
  }
  if (err.code === err.TIMEOUT) {
    return "Could not get your location in time. Try again near a window or outdoors.";
  }
  return "Could not read your GPS location. Try again.";
}

/** High-accuracy fix; falls back to watchPosition when getCurrentPosition times out. */
export function getBrowserPosition(options?: GeoOptions): Promise<BrowserPosition> {
  const timeoutMs = options?.timeoutMs ?? 20000;
  const maximumAge = options?.maximumAge ?? 0;

  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("This device does not support location services."));
      return;
    }

    const geoOpts: PositionOptions = {
      enableHighAccuracy: true,
      timeout: timeoutMs,
      maximumAge,
    };

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
    }, timeoutMs + 2000);

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
          geoOpts
        );
      },
      geoOpts
    );
  });
}
