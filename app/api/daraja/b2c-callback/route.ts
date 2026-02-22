import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * M-Pesa B2C callback - Safaricom sends transaction result here.
 * Updates withdrawal_requests status to completed or rejected.
 */
type ResultParameter = { Key: string; Value: string | number };
type B2CCallbackBody = {
  Result?: {
    ResultType?: number;
    ResultCode?: number;
    ResultDesc?: string;
    OriginatorConversationID?: string;
    ConversationID?: string;
    TransactionID?: string;
    ResultParameters?: {
      ResultParameter?: ResultParameter[];
    };
  };
};

function getParam(items: ResultParameter[] | undefined, key: string): string | number | null {
  const item = items?.find((i) => i.Key === key);
  return item?.Value ?? null;
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    let payload: B2CCallbackBody;
    try {
      payload = JSON.parse(rawBody) as B2CCallbackBody;
    } catch {
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid JSON" }, { status: 400 });
    }

    const result = payload.Result;
    if (!result) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Missing Result" }, { status: 200 });
    }

    const resultCode = Number(result.ResultCode ?? -1);
    const originatorId = String(result.OriginatorConversationID ?? "");
    const conversationId = String(result.ConversationID ?? "");
    const transactionId = String(result.TransactionID ?? "");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Server config error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Find withdrawal by OriginatorConversationID or ConversationID in metadata
    const { data: rows } = await supabase
      .from("withdrawal_requests")
      .select("id,amount,status,metadata")
      .in("status", ["approved", "processing"]);

    const wr = rows?.find((r) => {
      const meta = (r.metadata ?? {}) as Record<string, string>;
      return (
        meta.originator_conversation_id === originatorId ||
        meta.conversation_id === conversationId
      );
    });

    if (wr) {
      const newStatus = resultCode === 0 ? "completed" : "rejected";
      const items = result.ResultParameters?.ResultParameter ?? [];
      const receipt = String(getParam(items, "TransactionReceipt") ?? transactionId);
      const amount = Number(getParam(items, "TransactionAmount") ?? wr.amount);

      await supabase
        .from("withdrawal_requests")
        .update({
          status: newStatus,
          metadata: {
            ...((wr.metadata as object) ?? {}),
            conversation_id: conversationId,
            originator_conversation_id: originatorId,
            mpesa_transaction_id: transactionId,
            mpesa_receipt: receipt,
            b2c_result_code: resultCode,
            b2c_result_desc: result.ResultDesc,
            b2c_amount: amount,
          },
        } as any)
        .eq("id", wr.id);
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { ResultCode: 1, ResultDesc: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
