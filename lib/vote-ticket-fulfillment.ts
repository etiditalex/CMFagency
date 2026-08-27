import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Prefer the campaign row's `type` so successful payments count even when
 * `transactions.campaign_type` was null or out of sync.
 */
export async function resolveEffectiveCampaignType(
  supabase: SupabaseClient,
  campaignId: string,
  transactionCampaignType: string | null | undefined
): Promise<"vote" | "ticket" | "other"> {
  const { data: camp } = await supabase.from("campaigns").select("type").eq("id", campaignId).maybeSingle();
  const fromCampaign = String((camp as { type?: string } | null)?.type ?? "").toLowerCase().trim();
  if (fromCampaign === "vote") return "vote";
  if (fromCampaign === "ticket") return "ticket";

  const txType = String(transactionCampaignType ?? "").toLowerCase().trim();
  if (txType === "vote") return "vote";
  if (txType === "ticket") return "ticket";

  return "other";
}

export type VoteTicketFulfillmentArgs = {
  id: string;
  campaign_id: string;
  campaign_type: string;
  contestant_id: string | null;
  quantity: number;
};

/**
 * Idempotent: upserts `votes` or `ticket_issues` for a successful payment.
 * Corrects `transactions.campaign_type` when it disagrees with the resolved type.
 */
export async function upsertVoteOrTicketForSuccessfulTx(
  supabase: SupabaseClient,
  args: VoteTicketFulfillmentArgs,
  logPrefix: string
): Promise<{ fulfillErr: string | null; effectiveType: "vote" | "ticket" | "other" }> {
  const effective = await resolveEffectiveCampaignType(supabase, args.campaign_id, args.campaign_type);

  const txTypeNorm = String(args.campaign_type ?? "").toLowerCase().trim();
  if (effective !== txTypeNorm && (effective === "vote" || effective === "ticket")) {
    const { error: patchErr } = await supabase
      .from("transactions")
      .update({ campaign_type: effective } as Record<string, unknown>)
      .eq("id", args.id);
    if (patchErr) {
      console.warn(logPrefix, "campaign_type backfill skipped:", patchErr.message);
    }
  }

  if (effective === "vote") {
    if (!args.contestant_id) {
      console.error(logPrefix, "Vote success but contestant_id is null", args.id);
      return { fulfillErr: "vote_missing_contestant_id", effectiveType: effective };
    }
    const { error } = await supabase.from("votes").upsert(
      {
        transaction_id: args.id,
        campaign_id: args.campaign_id,
        contestant_id: args.contestant_id,
        votes: args.quantity,
      },
      { onConflict: "transaction_id" }
    );
    if (error) {
      console.error(logPrefix, "votes upsert failed:", error.message);
      return { fulfillErr: error.message, effectiveType: effective };
    }
    return { fulfillErr: null, effectiveType: effective };
  }

  if (effective === "ticket") {
    const { error } = await supabase.from("ticket_issues").upsert(
      {
        transaction_id: args.id,
        campaign_id: args.campaign_id,
        quantity: args.quantity,
      },
      { onConflict: "transaction_id" }
    );
    if (error) {
      console.error(logPrefix, "ticket_issues upsert failed:", error.message);
      return { fulfillErr: error.message, effectiveType: effective };
    }
    return { fulfillErr: null, effectiveType: effective };
  }

  return { fulfillErr: null, effectiveType: "other" };
}
