import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://cmfagency.co.ke";

const PAGES_TO_INDEX = [
  { path: "/", title: "Home", type: "page" as const },
  { path: "/about", title: "About Us", type: "page" as const },
  { path: "/services", title: "Services", type: "page" as const },
  { path: "/services/digital-marketing", title: "Digital Marketing", type: "service" as const },
  { path: "/services/website-development", title: "Website Development", type: "service" as const },
  { path: "/services/branding", title: "Branding", type: "service" as const },
  { path: "/services/market-research", title: "Market Research", type: "service" as const },
  { path: "/services/events-marketing", title: "Events Marketing", type: "service" as const },
  { path: "/services/content-creation", title: "Content Creation", type: "service" as const },
  { path: "/events", title: "Events", type: "event" as const },
  { path: "/events/upcoming", title: "Upcoming Events", type: "event" as const },
  { path: "/events/upcoming/coast-fashion-modelling-awards-2026", title: "CMFA 2026 - Ticketing & Voting", type: "event" as const },
  { path: "/contact", title: "Contact", type: "page" as const },
  { path: "/jobs", title: "Jobs", type: "page" as const },
  { path: "/career", title: "Careers", type: "page" as const },
  { path: "/marketing-fusion", title: "Marketing Fusion", type: "page" as const },
  { path: "/blogs", title: "Blogs", type: "blog" as const },
  { path: "/merchandise", title: "Merchandise", type: "page" as const },
];

/** Static fallback when live fetch returns 5xx or too little content (e.g. SSR issues during sync). */
const STATIC_FALLBACK: Record<string, string> = {
  "/events/upcoming":
    "Upcoming Events. Discover our upcoming events. View details, get tickets, and be part of the excitement. Coast Fashion and Modelling Awards 2026 (CMFA) – 15 August 2026, Mombasa, Kenya. Theme: Celebrating Heritage, Empowering Youth Talent, and Advancing Sustainable Fashion and Eco-Tourism. Buy tickets online. Check back for more upcoming events.",
  "/events/upcoming/coast-fashion-modelling-awards-2026":
    "Coast Fashion and Modelling Awards 2026 (CMFA 2026). Date: 15 August 2026. Location: Mombasa, Kenya. Theme: Celebrating Heritage, Empowering Youth Talent, and Advancing Sustainable Fashion and Eco-Tourism. Buy tickets online. Early bird: Regular KES 500, VIP KES 1500, VVIP KES 3500. Payment via Visa, Mastercard, M-Pesa, Airtel Money. Partnership and sponsorship enquiries welcome. Add to Google Calendar. Download sponsorship proposal. Participate as model, designer, volunteer, or creative performer.",
};

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user }, error: userErr } = await supabaseAnon.auth.getUser(token);
    if (userErr || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { data: pm } = await supabaseAnon
      .from("portal_members")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    const { data: au } = await supabaseAnon.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
    const isAdmin = (pm?.role === "admin" || pm?.role === "manager") || !!au;
    if (!isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Changer not configured" }, { status: 500 });
    }

    let synced = 0;
    const errors: string[] = [];

    for (const page of PAGES_TO_INDEX) {
      try {
        const url = `${BASE_URL}${page.path}`;
        const fallback = STATIC_FALLBACK[page.path];
        let contentText: string;

        try {
          const res = await fetch(url, {
            headers: { "User-Agent": "ChangerKnowledgeSync/1.0" },
          });
          if (!res.ok) {
            if (fallback && res.status >= 500) {
              contentText = fallback;
            } else {
              errors.push(`${page.path}: HTTP ${res.status}`);
              continue;
            }
          } else {
            const html = await res.text();
            contentText = stripHtml(html);
            if (contentText.length < 50 && fallback) {
              contentText = fallback;
            } else if (contentText.length < 50) {
              errors.push(`${page.path}: too little content`);
              continue;
            }
          }
        } catch (fetchErr) {
          if (fallback) {
            contentText = fallback;
          } else {
            errors.push(`${page.path}: ${fetchErr instanceof Error ? fetchErr.message : "Unknown"}`);
            continue;
          }
        }

        const { data: existing } = await supabaseAdmin
          .from("changer_knowledge")
          .select("id")
          .eq("source_url", url)
          .maybeSingle();

        if (existing) {
          const { error: updateErr } = await supabaseAdmin
            .from("changer_knowledge")
            .update({
              title: page.title,
              content_text: contentText,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
          if (updateErr) errors.push(`${page.path}: ${updateErr.message}`);
          else synced++;
        } else {
          const { error: insErr } = await supabaseAdmin
            .from("changer_knowledge")
            .insert({
              source_url: url,
              source_type: page.type,
              title: page.title,
              content_text: contentText,
            });
          if (insErr) errors.push(`${page.path}: ${insErr.message}`);
          else synced++;
        }
      } catch (e: unknown) {
        errors.push(`${page.path}: ${e instanceof Error ? e.message : "Unknown"}`);
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      total: PAGES_TO_INDEX.length,
      errors: errors.length ? errors : undefined,
    });
  } catch (err: unknown) {
    console.error("Changer sync-knowledge error:", err);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
