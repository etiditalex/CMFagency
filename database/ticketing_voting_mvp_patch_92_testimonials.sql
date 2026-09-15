-- Fusion Xpress: Testimonials / Success Stories
-- Public homepage + /testimonials read active rows; admins/managers manage all rows.
-- Event reviews land here as pending (is_active = false) until published from the dashboard.
--
-- Run this in the Supabase SQL editor, then reload Fusion Xpress → Testimonials.

create table if not exists public.testimonials (
  id serial primary key,
  name text not null,
  role text not null default '',
  quote text not null,
  image_url text not null default '',
  rating numeric(2,1),
  event_slug text,
  event_title text,
  reviewer_email text,
  source text not null default 'dashboard',
  show_on_home boolean not null default false,
  show_on_testimonials_page boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint testimonials_source_check check (source in ('dashboard', 'event_review')),
  constraint testimonials_rating_check check (rating is null or (rating >= 0 and rating <= 5))
);

create index if not exists testimonials_home_idx
  on public.testimonials (is_active, show_on_home, sort_order, id);

create index if not exists testimonials_page_idx
  on public.testimonials (is_active, show_on_testimonials_page, sort_order, id);

create index if not exists testimonials_event_slug_idx
  on public.testimonials (event_slug);

comment on table public.testimonials is
  'Client and event testimonials managed from Fusion Xpress. Feeds homepage Success Stories and /testimonials.';

alter table public.testimonials enable row level security;

drop policy if exists "testimonials_select" on public.testimonials;
create policy "testimonials_select"
  on public.testimonials
  for select
  using (
    (is_active = true and (show_on_home = true or show_on_testimonials_page = true))
    or (select public.is_admin())
  );

drop policy if exists "testimonials_admin_insert" on public.testimonials;
create policy "testimonials_admin_insert"
  on public.testimonials
  for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists "testimonials_admin_update" on public.testimonials;
create policy "testimonials_admin_update"
  on public.testimonials
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "testimonials_admin_delete" on public.testimonials;
create policy "testimonials_admin_delete"
  on public.testimonials
  for delete
  to authenticated
  using ((select public.is_admin()));

grant select on table public.testimonials to anon, authenticated;
grant insert, update, delete on table public.testimonials to authenticated;
grant usage, select on sequence public.testimonials_id_seq to authenticated, service_role;

drop trigger if exists set_testimonials_updated_at on public.testimonials;
create trigger set_testimonials_updated_at
  before update on public.testimonials
  for each row execute function public.set_updated_at();

insert into public.testimonials (
  name, role, quote, image_url, rating,
  show_on_home, show_on_testimonials_page, is_active, sort_order, source
)
select * from (
  values
    (
      'Amina Wanjiku',
      'Marketing Lead, Coastal Brands',
      'Working with Changer Fusions on our launch week changed how we show up. They planned the room, ran the campaign, and kept guests moving through Fusion Xpress without us chasing three vendors. Briefings, guest flow, and the posts that followed all sat in one plan, so the brand felt the same in the hall and on the phone the next morning.',
      'https://res.cloudinary.com/dyfnobo9r/image/upload/c_fill,g_face,w_160,h_160,f_auto,q_auto/v1765892261/IMG_9817_qlxozr.jpg',
      5.0,
      true, true, true, 10, 'dashboard'
    ),
    (
      'Brian Otieno',
      'Founder, Studio North',
      'We needed an event that still worked online the next morning. Their team treated ticketing, content, and the live moment as one brief. The run of show was clear, the campaign stayed live after last call, and we did not have to rebuild the story for social from scratch.',
      'https://res.cloudinary.com/dyfnobo9r/image/upload/c_fill,g_face,w_160,h_160,f_auto,q_auto/v1765892256/IMG_0331_zz7s2k.jpg',
      5.0,
      true, true, true, 20, 'dashboard'
    ),
    (
      'Faith Chebet',
      'Talent, Coast programme',
      'From audition floor to the awards night, the process was clear. I always knew the next step, and the team treated talent with the same care they give the brand on stage. Call times, looks, and the live moment were written down, so nobody was guessing, and the show still felt personal when the lights came up.',
      'https://res.cloudinary.com/dyfnobo9r/image/upload/c_fill,g_face,w_160,h_160,f_auto,q_auto/v1768448263/HighFashionAudition20251_ufpxud.jpg',
      5.0,
      true, true, true, 30, 'dashboard'
    ),
    (
      'Daniel Mwangi',
      'Operations Manager',
      'Run-of-show, vendors, and guest flow stayed tight. Changer Fusions made a complex day feel simple for our staff and for the people walking in the door. Radios, timings, and the last-minute changes all came through one desk, which meant the floor stayed calm even when the programme shifted.',
      'https://res.cloudinary.com/dyfnobo9r/image/upload/c_fill,g_face,w_160,h_160,f_auto,q_auto/v1765892258/IMG_0373_e07xid.jpg',
      5.0,
      true, true, true, 40, 'dashboard'
    ),
    (
      'Lillian Achieng',
      'Campaign Client',
      'The digital work did not stop when the event ended. Posts, tickets, and follow-up sat in one place, so the brand stayed visible after the last guest left. We could see who came, who voted, and what to send next week without opening five tools, which is the part of the brief we keep coming back to.',
      'https://res.cloudinary.com/dyfnobo9r/image/upload/c_fill,g_face,w_160,h_160,f_auto,q_auto/v1767153675/Global_women_impact_2_adeysa.jpg',
      5.0,
      true, true, true, 50, 'dashboard'
    ),
    (
      'Peter Kamau',
      'Events Partner',
      'We asked for a partner who could plan, promote, and measure. Changer Fusions did the three together, which is why we keep coming back. The event brief, the Fusion Xpress tickets, and the campaign report arrived as one thread, so our team spent the week on guests instead of chasing files.',
      'https://res.cloudinary.com/dyfnobo9r/image/upload/c_fill,g_face,w_160,h_160,f_auto,q_auto/v1765892255/IMG_0320_xc3kuq.jpg',
      5.0,
      true, true, true, 60, 'dashboard'
    ),
    (
      'Haron Waswa',
      'Mr. Climate Kenya 2023-2025',
      'Haron Waswa is the Flag Carrier for Mr. Climate Kenya 2023–2025 and also crowned Mr. Cambridge University. He is the former Mr. Rectified Eldoret, and currently the Mr. Kitenge Fashion Fest, a prestigious platform that showcases authentic cultural fabrics in fashion. He is Passionate, visionary, and committed, I continue to stand at the frontline of climate advocacy, community empowerment, and sustainable development.',
      'https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892256/IMG_0331_zz7s2k.jpg',
      4.5,
      false, true, true, 70, 'dashboard'
    ),
    (
      'Sarah Johnson',
      'CEO, TechCorp Inc.',
      'Changer Fusions transformed our event planning process. Their attention to detail and creative approach made our annual conference a huge success. The team''s professionalism and dedication to excellence is unmatched. Highly recommended!',
      'https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892261/IMG_9817_qlxozr.jpg',
      5.0,
      false, true, true, 80, 'dashboard'
    ),
    (
      'Michael Chen',
      'Marketing Director, GreenLife',
      'Working with Changer Fusions has been a game-changer for our brand. Their marketing strategies and portfolio of work speak for themselves. They understand our vision and deliver exceptional results every time.',
      'https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892256/IMG_0331_zz7s2k.jpg',
      5.0,
      false, true, true, 90, 'dashboard'
    ),
    (
      'Emily Rodriguez',
      'Event Coordinator, EventPro',
      'The team at Changer Fusions is professional, creative, and always delivers on time. They''ve helped us execute multiple successful events with seamless planning. Their expertise in event management is truly remarkable.',
      'https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892255/IMG_0320_xc3kuq.jpg',
      4.5,
      false, true, true, 100, 'dashboard'
    ),
    (
      'David Thompson',
      'Founder, StartupHub',
      'Changer Fusions'' comprehensive approach to marketing and event planning helped us establish our brand in the market. Their expertise is unmatched, and they truly care about their clients'' success.',
      'https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892258/IMG_0373_e07xid.jpg',
      5.0,
      false, true, true, 110, 'dashboard'
    )
) as seed(
  name, role, quote, image_url, rating,
  show_on_home, show_on_testimonials_page, is_active, sort_order, source
)
where not exists (select 1 from public.testimonials);

do $$ begin raise notice 'Testimonials table created.'; end $$;
