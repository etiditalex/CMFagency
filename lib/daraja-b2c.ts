/**
 * M-Pesa Daraja B2C API - Business to Customer payouts.
 * Used for wallet withdrawals. Requires B2C-specific credentials.
 *
 * Env required:
 * - MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET (or B2C-specific if different)
 * - MPESA_B2C_INITIATOR_NAME (API operator username for B2C)
 * - MPESA_B2C_SECURITY_CREDENTIAL (encrypted initiator password)
 * - MPESA_B2C_SHORTCODE (B2C shortcode - may differ from STK push)
 */
export type B2CResult =
  | { ok: true; conversationId: string; originatorConversationId: string }
  | { ok: false; error: string };

export async function initiateB2C(params: {
  amount: number;
  recipientPhone: string;
  remarks?: string;
  withdrawalId: string;
  resultUrl: string;
  queueTimeoutUrl: string;
}): Promise<B2CResult> {
  const {
    amount,
    recipientPhone,
    remarks = "Wallet withdrawal",
    withdrawalId,
    resultUrl,
    queueTimeoutUrl,
  } = params;

  const initiatorName = process.env.MPESA_B2C_INITIATOR_NAME;
  const securityCredential = process.env.MPESA_B2C_SECURITY_CREDENTIAL;
  const shortCode = process.env.MPESA_B2C_SHORTCODE ?? process.env.MPESA_SHORTCODE;
  const consumerKey = process.env.MPESA_CONSUMER_KEY ?? process.env.MPESA_B2C_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET ?? process.env.MPESA_B2C_CONSUMER_SECRET;
  const baseUrl = (process.env.MPESA_BASE_URL ?? "https://sandbox.safaricom.co.ke").replace(/\/$/, "");

  if (!initiatorName || !securityCredential || !shortCode) {
    return {
      ok: false,
      error: "B2C credentials missing. Set MPESA_B2C_INITIATOR_NAME, MPESA_B2C_SECURITY_CREDENTIAL, MPESA_B2C_SHORTCODE.",
    };
  }
  if (!consumerKey || !consumerSecret) {
    return { ok: false, error: "MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET required for OAuth." };
  }

  // OAuth token
  const oauthUrl = process.env.MPESA_OAUTH_URL ?? `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`;
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const tokenRes = await fetch(oauthUrl, {
    method: "GET",
    headers: { Authorization: `Basic ${auth}` },
  });

  const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!tokenRes.ok || !tokenJson.access_token) {
    return {
      ok: false,
      error: tokenJson.error ?? `OAuth failed (HTTP ${tokenRes.status})`,
    };
  }

  const b2cUrl = process.env.MPESA_B2C_URL ?? `${baseUrl}/mpesa/b2c/v1/paymentrequest`;
  const body = {
    InitiatorName: initiatorName,
    SecurityCredential: securityCredential,
    CommandID: "BusinessPayment",
    Amount: String(Math.round(amount)),
    PartyA: shortCode,
    PartyB: recipientPhone,
    Remarks: remarks.slice(0, 100),
    Occasion: withdrawalId.slice(0, 20),
    QueueTimeOutURL: queueTimeoutUrl,
    ResultURL: resultUrl,
  };

  const b2cRes = await fetch(b2cUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const b2cJson = (await b2cRes.json()) as {
    ConversationID?: string;
    OriginatorConversationID?: string;
    ResponseCode?: string;
    ResponseDescription?: string;
    errorMessage?: string;
  };

  if (!b2cRes.ok) {
    return {
      ok: false,
      error: b2cJson.errorMessage ?? b2cJson.ResponseDescription ?? `B2C failed (HTTP ${b2cRes.status})`,
    };
  }

  const code = String(b2cJson.ResponseCode ?? "");
  if (code !== "0") {
    return {
      ok: false,
      error: b2cJson.ResponseDescription ?? b2cJson.errorMessage ?? "B2C request rejected",
    };
  }

  return {
    ok: true,
    conversationId: b2cJson.ConversationID ?? "",
    originatorConversationId: b2cJson.OriginatorConversationID ?? "",
  };
}
