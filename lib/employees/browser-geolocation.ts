export type BrowserPosition = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
};

export function getBrowserPosition(options?: { timeoutMs?: number }): Promise<BrowserPosition> {
  const timeoutMs = options?.timeoutMs ?? 15000;

  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("This device does not support location services."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(
            new Error(
              "Location permission is required to sign in or out at your workplace. Enable location for this site in your browser settings."
            )
          );
          return;
        }
        if (err.code === err.TIMEOUT) {
          reject(new Error("Could not get your location in time. Try again near a window."));
          return;
        }
        reject(new Error("Could not read your GPS location. Try again."));
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0,
      }
    );
  });
}
