import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Props) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    return NextResponse.json({ error: "This poll is not available." }, { status: 404 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Polls are not connected." }, { status: 503 });
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: member } = await admin.from("portal_members").select("role").eq("user_id", auth.userId).maybeSingle();
  const role = String(member?.role ?? "");
  const isAdmin = role === "admin" || role === "manager";

  const poll = await admin
    .from("fusion_polls")
    .select("id,title,created_by,topic,collect_contact")
    .eq("id", id)
    .maybeSingle();
  if (poll.error && /collect_contact/i.test(poll.error.message)) {
    return NextResponse.json(
      {
        error:
          "Collecting names and emails needs database/ticketing_voting_mvp_patch_102_fusion_poll_collect_contact.sql in the Supabase SQL editor.",
      },
      { status: 503 },
    );
  }
  if (poll.error || !poll.data || poll.data.topic !== "poll") {
    return NextResponse.json({ error: "This poll is not available." }, { status: 404 });
  }
  if (!isAdmin && poll.data.created_by !== auth.userId) {
    return NextResponse.json({ error: "You can only view responses for polls you created." }, { status: 403 });
  }

  const collectContact = poll.data.collect_contact === true;
  if (!collectContact) {
    return NextResponse.json({ title: poll.data.title, collectContact: false, responses: [] });
  }

  const votes = await admin
    .from("fusion_poll_votes")
    .select("id,voter_name,voter_email,option_id,created_at")
    .eq("poll_id", id)
    .not("voter_email", "is", null)
    .order("created_at", { ascending: false });
  if (votes.error) {
    const message = /voter_name|voter_email|schema cache/i.test(votes.error.message)
      ? "Voter details need database/ticketing_voting_mvp_patch_101_fusion_poll_live_voter.sql in the Supabase SQL editor."
      : "Responses could not be loaded.";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const optionIds = [...new Set((votes.data ?? []).map((row) => String(row.option_id)))];
  const options = optionIds.length
    ? await admin.from("fusion_poll_options").select("id,name").in("id", optionIds)
    : { data: [] as { id: string; name: string }[] };
  const names = new Map((options.data ?? []).map((option) => [String(option.id), option.name]));

  return NextResponse.json({
    title: poll.data.title,
    collectContact: true,
    responses: (votes.data ?? []).map((row) => ({
      id: String(row.id),
      name: String(row.voter_name ?? ""),
      email: String(row.voter_email ?? ""),
      choice: names.get(String(row.option_id)) ?? "Choice",
      at: String(row.created_at),
    })),
  });
}
