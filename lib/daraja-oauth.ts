type DarajaOAuthResult =
  | { ok: true; accessToken: string }
  | { ok: false; error: string; httpStatus?: number };

type TokenCache = {
  token: string;
  expiresAt: number;
};

let cachedToken: TokenCache | null = null;
let inFlight: Promise<DarajaOAuthResult> | null = null;

/** Safaricom tokens are valid ~3600s; refresh early to avoid edge-case expiry. */
const TOKEN_TTL_MS = 55 * 60 * 1000;

function resolveOAuthUrl(): string | null {
  const baseUrl = (process.env.MPESA_BASE_URL ?? "https://sandbox.safaricom.co.ke").replace(/\/$/, "");
  let oauthUrl = process.env.MPESA_OAUTH_URL ?? `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`;
  if (!oauthUrl.includes("grant_type=")) {
    oauthUrl += (oauthUrl.includes("?") ? "&" : "?") + "grant_type=client_credentials";
  }
  return oauthUrl;
}

async function fetchFreshToken(): Promise<DarajaOAuthResult> {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  if (!consumerKey || !consumerSecret) {
    return { ok: false, error: "M-Pesa credentials not configured" };
  }

  const oauthUrl = resolveOAuthUrl();
  if (!oauthUrl) return { ok: false, error: "M-Pesa OAuth URL not configured" };

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  let tokenRes: Response;
  try {
    tokenRes = await fetch(oauthUrl, {
      method: "GET",
      headers: { Authorization: `Basic ${auth}` },
    });
  } catch (fetchErr) {
    const msg = fetchErr instanceof Error ? fetchErr.message : "Network error";
    return { ok: false, error: `Cannot reach Daraja OAuth (${msg})` };
  }

  let tokenJson: { access_token?: string; error?: string; error_description?: string };
  try {
    tokenJson = (await tokenRes.json()) as typeof tokenJson;
  } catch {
    return { ok: false, error: `Daraja OAuth returned invalid response (HTTP ${tokenRes.status})`, httpStatus: tokenRes.status };
  }

  if (!tokenRes.ok || !tokenJson.access_token) {
    const statusHint =
      tokenRes.status === 401
        ? "Invalid consumer key or secret"
        : tokenRes.status === 404
          ? "OAuth URL not found — check MPESA_OAUTH_URL"
          : tokenRes.status >= 500
            ? "Safaricom server error — try again later"
            : "Failed to get Daraja OAuth token";
    const errMsg = tokenJson.error_description ?? tokenJson.error ?? statusHint;
    return { ok: false, error: `${errMsg} (HTTP ${tokenRes.status})`, httpStatus: tokenRes.status };
  }

  cachedToken = {
    token: tokenJson.access_token,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  };
  return { ok: true, accessToken: tokenJson.access_token };
}

/**
 * Returns a cached Daraja OAuth access token when still valid.
 * Concurrent callers share one in-flight refresh.
 */
export function fetchDarajaAccessToken(): Promise<DarajaOAuthResult> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return Promise.resolve({ ok: true, accessToken: cachedToken.token });
  }

  if (!inFlight) {
    inFlight = fetchFreshToken().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

/** Start OAuth fetch early so it can overlap with DB work in payment init routes. */
export function prefetchDarajaAccessToken(): void {
  void fetchDarajaAccessToken();
}
