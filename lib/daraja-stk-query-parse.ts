import type { CallbackMetadataItem } from "@/lib/daraja-finalize-stk-from-items";

export type ParsedDarajaStkQuery = {
  parseOk: boolean;
  resultCode: number;
  resultDesc: string;
  items: CallbackMetadataItem[];
  /** HTTP-level ResponseCode from Daraja when present (0 = API accepted the query). */
  responseCode?: number;
  rawError?: string;
};

type ResultParameter = { Key?: string; Value?: string | number };

function toItemsFromCallbackMeta(meta: unknown): CallbackMetadataItem[] {
  if (!meta || typeof meta !== "object") return [];
  const item = (meta as { Item?: Array<{ Name?: string; Value?: string | number }> }).Item;
  if (!Array.isArray(item)) return [];
  return item
    .filter((i) => i?.Name != null)
    .map((i) => ({ Name: String(i.Name), Value: i.Value ?? "" }));
}

function toItemsFromResultParameters(params: unknown): CallbackMetadataItem[] {
  if (!params || typeof params !== "object") return [];
  const list = (params as { ResultParameter?: ResultParameter[] }).ResultParameter;
  if (!Array.isArray(list)) return [];
  return list
    .filter((p) => p?.Key != null)
    .map((p) => ({ Name: String(p.Key), Value: p.Value ?? "" }));
}

/**
 * Parse Safaricom STK Push **Query** response (not the STK callback webhook shape).
 * Handles flat JSON, nested `Result`, and `ResultParameters` vs `CallbackMetadata`.
 */
export function parseDarajaStkQueryResponse(body: unknown): ParsedDarajaStkQuery {
  if (!body || typeof body !== "object") {
    return { parseOk: false, resultCode: -1, resultDesc: "", items: [], rawError: "empty response" };
  }

  const o = body as Record<string, unknown>;

  const fault = o.fault as { faultstring?: string } | undefined;
  const apiError =
    String(o.errorMessage ?? o.error_message ?? fault?.faultstring ?? "").trim() ||
    (o.errorCode != null ? String(o.errorCode) : "");
  if (apiError && o.ResultCode == null && o.resultCode == null) {
    return {
      parseOk: false,
      resultCode: -1,
      resultDesc: apiError,
      items: [],
      rawError: apiError,
    };
  }

  const inner = (o.Result as Record<string, unknown>) ?? (o.result as Record<string, unknown>);
  const root = inner && typeof inner === "object" ? inner : o;

  const rcRaw = root.ResultCode ?? root.resultCode ?? o.ResultCode ?? o.resultCode;
  const responseCodeRaw = o.ResponseCode ?? o.responseCode ?? root.ResponseCode;

  if (rcRaw === undefined || rcRaw === null || rcRaw === "") {
    const desc = String(
      root.ResultDesc ?? root.resultDesc ?? o.ResultDesc ?? o.ResponseDescription ?? o.responseDescription ?? ""
    );
    return {
      parseOk: false,
      resultCode: -1,
      resultDesc: desc,
      items: [],
      rawError: desc || "missing ResultCode",
    };
  }

  const resultCode = Number(rcRaw);
  if (!Number.isFinite(resultCode)) {
    return { parseOk: false, resultCode: -1, resultDesc: "", items: [], rawError: "invalid ResultCode" };
  }

  const resultDesc = String(
    root.ResultDesc ?? root.resultDesc ?? o.ResultDesc ?? o.ResponseDescription ?? o.responseDescription ?? ""
  );

  const responseCode =
    responseCodeRaw != null && responseCodeRaw !== "" ? Number(responseCodeRaw) : undefined;

  let items = toItemsFromCallbackMeta(root.CallbackMetadata ?? o.CallbackMetadata);
  if (items.length === 0) {
    items = toItemsFromResultParameters(root.ResultParameters ?? o.ResultParameters);
  }

  return {
    parseOk: true,
    resultCode,
    resultDesc,
    items,
    responseCode: Number.isFinite(responseCode) ? responseCode : undefined,
  };
}
