-- Fusion Xpress: Polling Fx
-- Polls created in the dashboard appear on /poll/live.
-- Comments posted on a result page are stored in fusion_poll_comments.
-- Apply in the Supabase SQL editor after the set_updated_at() and is_admin() functions exist.

create table if not exists public.fusion_polls (
  id text primary key,
  title text not null,
  question text not null,
  topic text not null,
  topic_label text not null,
  status text not null default 'Live',
  region text not null default 'Nairobi',
  county text not null default 'Nairobi',
  ends_label text not null default '',
  spoiled_votes integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fusion_polls_id_format check (id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint fusion_polls_topic_check check (topic in ('brand','politics','presidential','gubernatorial','senatorial','events','opinion','campaign')),
  constraint fusion_polls_status_check check (status in ('Live','Ended','Scheduled')),
  constraint fusion_polls_spoiled_votes_check check (spoiled_votes >= 0)
);

create table if not exists public.fusion_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id text not null references public.fusion_polls(id) on delete cascade,
  name text not null,
  label text not null default '',
  image_url text,
  votes integer not null default 0,
  sort_order integer not null default 0,
  constraint fusion_poll_options_votes_check check (votes >= 0),
  constraint fusion_poll_options_name_len check (char_length(name) between 1 and 80)
);

create table if not exists public.fusion_poll_comments (
  id uuid primary key default gen_random_uuid(),
  poll_id text not null references public.fusion_polls(id) on delete cascade,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint fusion_poll_comments_name_len check (char_length(author_name) between 1 and 60),
  constraint fusion_poll_comments_body_len check (char_length(body) between 1 and 500)
);

create index if not exists fusion_polls_status_idx on public.fusion_polls(status);
create index if not exists fusion_polls_topic_idx on public.fusion_polls(topic);
create index if not exists fusion_poll_options_poll_idx on public.fusion_poll_options(poll_id, sort_order);
create index if not exists fusion_poll_comments_poll_idx on public.fusion_poll_comments(poll_id, created_at desc);

alter table public.fusion_polls enable row level security;
alter table public.fusion_poll_options enable row level security;
alter table public.fusion_poll_comments enable row level security;

drop policy if exists "fusion_polls_public_read" on public.fusion_polls;
create policy "fusion_polls_public_read" on public.fusion_polls for select using (true);
drop policy if exists "fusion_polls_admin_all" on public.fusion_polls;
create policy "fusion_polls_admin_all" on public.fusion_polls for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "fusion_poll_options_public_read" on public.fusion_poll_options;
create policy "fusion_poll_options_public_read" on public.fusion_poll_options for select using (true);
drop policy if exists "fusion_poll_options_admin_all" on public.fusion_poll_options;
create policy "fusion_poll_options_admin_all" on public.fusion_poll_options for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "fusion_poll_comments_public_read" on public.fusion_poll_comments;
create policy "fusion_poll_comments_public_read" on public.fusion_poll_comments for select using (true);
drop policy if exists "fusion_poll_comments_public_insert" on public.fusion_poll_comments;
create policy "fusion_poll_comments_public_insert" on public.fusion_poll_comments for insert to anon, authenticated
  with check (
    char_length(author_name) between 1 and 60
    and char_length(body) between 1 and 500
    and exists (select 1 from public.fusion_polls p where p.id = poll_id)
  );
drop policy if exists "fusion_poll_comments_admin_all" on public.fusion_poll_comments;
create policy "fusion_poll_comments_admin_all" on public.fusion_poll_comments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on table public.fusion_polls to anon, authenticated;
grant insert, update, delete on table public.fusion_polls to authenticated;
grant select on table public.fusion_poll_options to anon, authenticated;
grant insert, update, delete on table public.fusion_poll_options to authenticated;
grant select, insert on table public.fusion_poll_comments to anon, authenticated;
grant update, delete on table public.fusion_poll_comments to authenticated;

drop trigger if exists set_fusion_polls_updated_at on public.fusion_polls;
create trigger set_fusion_polls_updated_at
  before update on public.fusion_polls
  for each row execute function public.set_updated_at();

insert into public.fusion_polls (id, title, question, topic, topic_label, status, region, county, ends_label, spoiled_votes, created_at)
values
  ('embu', 'Embu County Senatorial Poll (Sample)', 'If elections were held today, which candidate are you likely to vote for as your Senator?', 'senatorial', 'Senatorial', 'Ended', 'Eastern', 'Embu', '6 Oct 2026, 21:42', 0, '2026-09-01T00:00:00.000Z'),
  ('wajir', 'Wajir County Senatorial Poll (Sample)', 'If elections were held today, which candidate are you likely to vote for as your Senator?', 'senatorial', 'Senatorial', 'Ended', 'North Eastern', 'Wajir', '1 Oct 2026, 03:53', 0, '2026-09-01T00:01:00.000Z'),
  ('kericho', 'Kericho County Senatorial Poll (Sample)', 'If elections were held today, which candidate are you likely to vote for as your Senator?', 'senatorial', 'Senatorial', 'Ended', 'Rift Valley', 'Kericho', '26 Sept 2026, 04:14', 0, '2026-09-01T00:02:00.000Z'),
  ('nairobi-senate', 'Nairobi County Senatorial Poll (Sample)', 'If elections were held today, which candidate are you likely to vote for as your Senator?', 'senatorial', 'Senatorial', 'Ended', 'Nairobi', 'Nairobi', '4 Oct 2026, 18:10', 0, '2026-09-01T00:03:00.000Z'),
  ('mombasa-senate', 'Mombasa County Senatorial Poll (Sample)', 'If elections were held today, which candidate are you likely to vote for as your Senator?', 'senatorial', 'Senatorial', 'Ended', 'Coast', 'Mombasa', '2 Oct 2026, 20:05', 0, '2026-09-01T00:04:00.000Z'),
  ('kisumu-senate', 'Kisumu County Senatorial Poll (Sample)', 'If elections were held today, which candidate are you likely to vote for as your Senator?', 'senatorial', 'Senatorial', 'Ended', 'Nyanza', 'Kisumu', '30 Sept 2026, 16:40', 0, '2026-09-01T00:05:00.000Z'),
  ('nakuru-senate', 'Nakuru County Senatorial Poll (Sample)', 'If elections were held today, which candidate are you likely to vote for as your Senator?', 'senatorial', 'Senatorial', 'Ended', 'Rift Valley', 'Nakuru', '28 Sept 2026, 19:22', 0, '2026-09-01T00:06:00.000Z'),
  ('kiambu-senate', 'Kiambu County Senatorial Poll (Sample)', 'If elections were held today, which candidate are you likely to vote for as your Senator?', 'senatorial', 'Senatorial', 'Ended', 'Central', 'Kiambu', '27 Sept 2026, 11:15', 0, '2026-09-01T00:07:00.000Z'),
  ('kilifi-senate', 'Kilifi County Senatorial Poll (Sample)', 'If elections were held today, which candidate are you likely to vote for as your Senator?', 'senatorial', 'Senatorial', 'Ended', 'Coast', 'Kilifi', '25 Sept 2026, 09:48', 0, '2026-09-01T00:08:00.000Z'),
  ('uasingishu-senate', 'Uasin Gishu County Senatorial Poll (Sample)', 'If elections were held today, which candidate are you likely to vote for as your Senator?', 'senatorial', 'Senatorial', 'Ended', 'Rift Valley', 'Uasin Gishu', '24 Sept 2026, 22:30', 0, '2026-09-01T00:09:00.000Z'),
  ('kakamega-senate', 'Kakamega County Senatorial Poll (Sample)', 'If elections were held today, which candidate are you likely to vote for as your Senator?', 'senatorial', 'Senatorial', 'Ended', 'Western', 'Kakamega', '22 Sept 2026, 15:05', 0, '2026-09-01T00:10:00.000Z'),
  ('machakos-senate', 'Machakos County Senatorial Poll (Sample)', 'If elections were held today, which candidate are you likely to vote for as your Senator?', 'senatorial', 'Senatorial', 'Ended', 'Eastern', 'Machakos', '20 Sept 2026, 13:12', 0, '2026-09-01T00:11:00.000Z'),
  ('runway-brand', 'Runway brand poll for the next studio session', 'Which brand should lead the next Changer Fusions showcase?', 'brand', 'Brand', 'Ended', 'Nairobi', 'Nairobi', '8 Oct 2026, 19:00', 0, '2026-09-01T00:12:00.000Z'),
  ('coast-brand', 'Coast fashion brand preference poll', 'Which brand should lead the next Changer Fusions showcase?', 'brand', 'Brand', 'Ended', 'Coast', 'Mombasa', '3 Oct 2026, 17:30', 0, '2026-09-01T00:13:00.000Z'),
  ('audience-politics', 'Audience politics poll for the next civic forum', 'Which position should the next civic forum take?', 'politics', 'Politics', 'Ended', 'Nairobi', 'Nairobi', '7 Oct 2026, 12:00', 0, '2026-09-01T00:14:00.000Z'),
  ('presidential-sample', 'Presidential preference poll (sample)', 'If elections were held today, which candidate are you likely to vote for as President?', 'presidential', 'Presidential', 'Ended', 'Nairobi', 'Nairobi', '5 Oct 2026, 21:00', 0, '2026-09-01T00:15:00.000Z'),
  ('gubernatorial-mombasa', 'Mombasa gubernatorial poll (sample)', 'If elections were held today, which candidate are you likely to vote for as Governor of Mombasa?', 'gubernatorial', 'Gubernatorial', 'Ended', 'Coast', 'Mombasa', '29 Sept 2026, 18:45', 0, '2026-09-01T00:16:00.000Z'),
  ('runway-event', 'Who should take the runway next', 'Who should take the runway at the next session?', 'events', 'Events', 'Ended', 'Coast', 'Kilifi', '9 Oct 2026, 20:15', 0, '2026-09-01T00:17:00.000Z'),
  ('opinion-launch', 'Opinion poll on the next brand launch', 'What should the next brand launch lead with?', 'opinion', 'Opinion', 'Ended', 'Central', 'Kiambu', '6 Oct 2026, 14:20', 0, '2026-09-01T00:18:00.000Z'),
  ('campaign-sample', 'Campaign message poll for the season', 'Which campaign message should run this season?', 'campaign', 'Campaign', 'Ended', 'Rift Valley', 'Nakuru', '4 Oct 2026, 10:05', 0, '2026-09-01T00:19:00.000Z'),
  ('live-brand', 'Live brand poll for tonight''s showcase', 'Which brand should lead the next Changer Fusions showcase?', 'brand', 'Brand', 'Live', 'Nairobi', 'Nairobi', '12 Oct 2026, 22:00', 0, '2026-09-01T00:20:00.000Z'),
  ('live-senate', 'Nairobi senatorial poll still open', 'If elections were held today, which candidate are you likely to vote for as your Senator?', 'senatorial', 'Senatorial', 'Live', 'Nairobi', 'Nairobi', '12 Oct 2026, 23:59', 0, '2026-09-01T00:21:00.000Z')
on conflict (id) do nothing;

insert into public.fusion_poll_options (poll_id, name, label, votes, sort_order)
select v.poll_id, v.name, v.label, v.votes, v.sort_order
from (values
  ('embu', 'David Otieno', 'No party', 800, 0),
  ('embu', 'Grace Wanjiku', 'No party', 642, 1),
  ('embu', 'Peter Kamau', 'No party', 587, 2),
  ('embu', 'Faith Chebet', 'No party', 557, 3),
  ('embu', 'Brian Omondi', 'No party', 480, 4),
  ('embu', 'Lucy Njeri', 'No party', 420, 5),
  ('embu', 'Samuel Kiptoo', 'No party', 411, 6),
  ('embu', 'Amina Kariuki', 'No party', 385, 7),
  ('wajir', 'Brian Omondi', 'No party', 315, 0),
  ('wajir', 'Lucy Njeri', 'No party', 252, 1),
  ('wajir', 'Samuel Kiptoo', 'No party', 230, 2),
  ('wajir', 'Amina Kariuki', 'No party', 219, 3),
  ('wajir', 'David Otieno', 'No party', 188, 4),
  ('wajir', 'Grace Wanjiku', 'No party', 165, 5),
  ('wajir', 'Peter Kamau', 'No party', 161, 6),
  ('wajir', 'Faith Chebet', 'No party', 151, 7),
  ('kericho', 'Brian Omondi', 'No party', 464, 0),
  ('kericho', 'Lucy Njeri', 'No party', 373, 1),
  ('kericho', 'Samuel Kiptoo', 'No party', 341, 2),
  ('kericho', 'Amina Kariuki', 'No party', 323, 3),
  ('kericho', 'David Otieno', 'No party', 279, 4),
  ('kericho', 'Grace Wanjiku', 'No party', 244, 5),
  ('kericho', 'Peter Kamau', 'No party', 239, 6),
  ('kericho', 'Faith Chebet', 'No party', 224, 7),
  ('nairobi-senate', 'David Otieno', 'No party', 1144, 0),
  ('nairobi-senate', 'Grace Wanjiku', 'No party', 918, 1),
  ('nairobi-senate', 'Peter Kamau', 'No party', 838, 2),
  ('nairobi-senate', 'Faith Chebet', 'No party', 796, 3),
  ('nairobi-senate', 'Brian Omondi', 'No party', 685, 4),
  ('nairobi-senate', 'Lucy Njeri', 'No party', 600, 5),
  ('nairobi-senate', 'Samuel Kiptoo', 'No party', 588, 6),
  ('nairobi-senate', 'Amina Kariuki', 'No party', 551, 7),
  ('mombasa-senate', 'Brian Omondi', 'No party', 564, 0),
  ('mombasa-senate', 'Lucy Njeri', 'No party', 452, 1),
  ('mombasa-senate', 'Samuel Kiptoo', 'No party', 413, 2),
  ('mombasa-senate', 'Amina Kariuki', 'No party', 392, 3),
  ('mombasa-senate', 'David Otieno', 'No party', 338, 4),
  ('mombasa-senate', 'Grace Wanjiku', 'No party', 295, 5),
  ('mombasa-senate', 'Peter Kamau', 'No party', 289, 6),
  ('mombasa-senate', 'Faith Chebet', 'No party', 271, 7),
  ('kisumu-senate', 'Peter Kamau', 'No party', 513, 0),
  ('kisumu-senate', 'Faith Chebet', 'No party', 412, 1),
  ('kisumu-senate', 'Brian Omondi', 'No party', 376, 2),
  ('kisumu-senate', 'Lucy Njeri', 'No party', 357, 3),
  ('kisumu-senate', 'Samuel Kiptoo', 'No party', 307, 4),
  ('kisumu-senate', 'Amina Kariuki', 'No party', 269, 5),
  ('kisumu-senate', 'David Otieno', 'No party', 263, 6),
  ('kisumu-senate', 'Grace Wanjiku', 'No party', 247, 7),
  ('nakuru-senate', 'Peter Kamau', 'No party', 665, 0),
  ('nakuru-senate', 'Faith Chebet', 'No party', 534, 1),
  ('nakuru-senate', 'Brian Omondi', 'No party', 488, 2),
  ('nakuru-senate', 'Lucy Njeri', 'No party', 463, 3),
  ('nakuru-senate', 'Samuel Kiptoo', 'No party', 399, 4),
  ('nakuru-senate', 'Amina Kariuki', 'No party', 349, 5),
  ('nakuru-senate', 'David Otieno', 'No party', 342, 6),
  ('nakuru-senate', 'Grace Wanjiku', 'No party', 320, 7),
  ('kiambu-senate', 'Lucy Njeri', 'No party', 540, 0),
  ('kiambu-senate', 'Samuel Kiptoo', 'No party', 434, 1),
  ('kiambu-senate', 'Amina Kariuki', 'No party', 396, 2),
  ('kiambu-senate', 'David Otieno', 'No party', 376, 3),
  ('kiambu-senate', 'Grace Wanjiku', 'No party', 324, 4),
  ('kiambu-senate', 'Peter Kamau', 'No party', 283, 5),
  ('kiambu-senate', 'Faith Chebet', 'No party', 277, 6),
  ('kiambu-senate', 'Brian Omondi', 'No party', 260, 7),
  ('kilifi-senate', 'Brian Omondi', 'No party', 362, 0),
  ('kilifi-senate', 'Lucy Njeri', 'No party', 292, 1),
  ('kilifi-senate', 'Samuel Kiptoo', 'No party', 266, 2),
  ('kilifi-senate', 'Amina Kariuki', 'No party', 253, 3),
  ('kilifi-senate', 'David Otieno', 'No party', 218, 4),
  ('kilifi-senate', 'Grace Wanjiku', 'No party', 191, 5),
  ('kilifi-senate', 'Peter Kamau', 'No party', 187, 6),
  ('kilifi-senate', 'Faith Chebet', 'No party', 175, 7),
  ('uasingishu-senate', 'Brian Omondi', 'No party', 415, 0),
  ('uasingishu-senate', 'Lucy Njeri', 'No party', 333, 1),
  ('uasingishu-senate', 'Samuel Kiptoo', 'No party', 304, 2),
  ('uasingishu-senate', 'Amina Kariuki', 'No party', 288, 3),
  ('uasingishu-senate', 'David Otieno', 'No party', 248, 4),
  ('uasingishu-senate', 'Grace Wanjiku', 'No party', 217, 5),
  ('uasingishu-senate', 'Peter Kamau', 'No party', 213, 6),
  ('uasingishu-senate', 'Faith Chebet', 'No party', 200, 7),
  ('kakamega-senate', 'Samuel Kiptoo', 'No party', 500, 0),
  ('kakamega-senate', 'Amina Kariuki', 'No party', 401, 1),
  ('kakamega-senate', 'David Otieno', 'No party', 366, 2),
  ('kakamega-senate', 'Grace Wanjiku', 'No party', 348, 3),
  ('kakamega-senate', 'Peter Kamau', 'No party', 300, 4),
  ('kakamega-senate', 'Faith Chebet', 'No party', 262, 5),
  ('kakamega-senate', 'Brian Omondi', 'No party', 257, 6),
  ('kakamega-senate', 'Lucy Njeri', 'No party', 241, 7),
  ('machakos-senate', 'Faith Chebet', 'No party', 451, 0),
  ('machakos-senate', 'Brian Omondi', 'No party', 362, 1),
  ('machakos-senate', 'Lucy Njeri', 'No party', 330, 2),
  ('machakos-senate', 'Samuel Kiptoo', 'No party', 313, 3),
  ('machakos-senate', 'Amina Kariuki', 'No party', 270, 4),
  ('machakos-senate', 'David Otieno', 'No party', 236, 5),
  ('machakos-senate', 'Grace Wanjiku', 'No party', 231, 6),
  ('machakos-senate', 'Peter Kamau', 'No party', 217, 7),
  ('runway-brand', 'Changer Atelier', 'Brand', 199, 0),
  ('runway-brand', 'Coast Line', 'Brand', 159, 1),
  ('runway-brand', 'Studio North', 'Brand', 145, 2),
  ('runway-brand', 'Runway Edit', 'Brand', 138, 3),
  ('runway-brand', 'Fusion Label', 'Brand', 119, 4),
  ('runway-brand', 'Night Market', 'Brand', 104, 5),
  ('coast-brand', 'Fusion Label', 'Brand', 124, 0),
  ('coast-brand', 'Night Market', 'Brand', 100, 1),
  ('coast-brand', 'Changer Atelier', 'Brand', 91, 2),
  ('coast-brand', 'Coast Line', 'Brand', 87, 3),
  ('coast-brand', 'Studio North', 'Brand', 75, 4),
  ('coast-brand', 'Runway Edit', 'Brand', 65, 5),
  ('audience-politics', 'Open the debate', 'Forum', 438, 0),
  ('audience-politics', 'Publish the brief', 'Forum', 351, 1),
  ('audience-politics', 'Host a town hall', 'Forum', 320, 2),
  ('audience-politics', 'Run a follow-up poll', 'Forum', 304, 3),
  ('audience-politics', 'Invite the brands', 'Forum', 262, 4),
  ('audience-politics', 'Keep the floor open', 'Forum', 229, 5),
  ('presidential-sample', 'Ruth Wairimu', 'No party', 1574, 0),
  ('presidential-sample', 'Daniel Kiprop', 'No party', 1263, 1),
  ('presidential-sample', 'Mercy Achieng', 'No party', 1154, 2),
  ('presidential-sample', 'Isaac Mutua', 'No party', 1095, 3),
  ('presidential-sample', 'Naomi Cheruiyot', 'No party', 943, 4),
  ('presidential-sample', 'James Mwangi', 'No party', 825, 5),
  ('presidential-sample', 'Halima Yusuf', 'No party', 808, 6),
  ('presidential-sample', 'Kevin Otieno', 'No party', 758, 7),
  ('gubernatorial-mombasa', 'Paul Odhiambo', 'No party', 768, 0),
  ('gubernatorial-mombasa', 'Irene Chepkemoi', 'No party', 615, 1),
  ('gubernatorial-mombasa', 'Felix Njoroge', 'No party', 562, 2),
  ('gubernatorial-mombasa', 'Zawadi Ali', 'No party', 533, 3),
  ('gubernatorial-mombasa', 'Joseph Maina', 'No party', 459, 4),
  ('gubernatorial-mombasa', 'Asha Hassan', 'No party', 402, 5),
  ('gubernatorial-mombasa', 'Eric Langat', 'No party', 394, 6),
  ('gubernatorial-mombasa', 'Catherine Wanjiru', 'No party', 369, 7),
  ('runway-event', 'Guest walk', 'Runway', 168, 0),
  ('runway-event', 'Press call', 'Runway', 136, 1),
  ('runway-event', 'After party', 'Runway', 124, 2),
  ('runway-event', 'Opening look', 'Runway', 118, 3),
  ('runway-event', 'Studio session', 'Runway', 101, 4),
  ('runway-event', 'Runway finale', 'Runway', 89, 5),
  ('opinion-launch', 'A community brief', 'Audience', 296, 0),
  ('opinion-launch', 'The studio story', 'Audience', 237, 1),
  ('opinion-launch', 'The collection', 'Audience', 217, 2),
  ('opinion-launch', 'The campaign film', 'Audience', 206, 3),
  ('opinion-launch', 'A live poll', 'Audience', 177, 4),
  ('opinion-launch', 'The runway cast', 'Audience', 155, 5),
  ('campaign-sample', 'The next runway', 'Campaign', 228, 0),
  ('campaign-sample', 'Audience first', 'Campaign', 182, 1),
  ('campaign-sample', 'Brand in motion', 'Campaign', 167, 2),
  ('campaign-sample', 'Live results', 'Campaign', 158, 3),
  ('campaign-sample', 'Coast to capital', 'Campaign', 136, 4),
  ('campaign-sample', 'Market to thrive', 'Campaign', 119, 5),
  ('live-brand', 'Changer Atelier', 'Brand', 72, 0),
  ('live-brand', 'Coast Line', 'Brand', 59, 1),
  ('live-brand', 'Studio North', 'Brand', 54, 2),
  ('live-brand', 'Runway Edit', 'Brand', 51, 3),
  ('live-brand', 'Fusion Label', 'Brand', 44, 4),
  ('live-brand', 'Night Market', 'Brand', 38, 5),
  ('live-senate', 'Brian Omondi', 'No party', 288, 0),
  ('live-senate', 'Lucy Njeri', 'No party', 231, 1),
  ('live-senate', 'Samuel Kiptoo', 'No party', 211, 2),
  ('live-senate', 'Amina Kariuki', 'No party', 200, 3),
  ('live-senate', 'David Otieno', 'No party', 172, 4),
  ('live-senate', 'Grace Wanjiku', 'No party', 151, 5),
  ('live-senate', 'Peter Kamau', 'No party', 148, 6),
  ('live-senate', 'Faith Chebet', 'No party', 139, 7)
) as v(poll_id, name, label, votes, sort_order)
where not exists (
  select 1 from public.fusion_poll_options existing where existing.poll_id = v.poll_id
);

insert into public.fusion_poll_comments (poll_id, author_name, body, created_at)
select p.id, c.author_name, c.body, c.created_at
from public.fusion_polls p
cross join (values
  ('Amina Hassan', 'The brand vote feels closer than the runway chatter suggested. Curious how Coast audiences land once the full week is in.', '2026-10-07T18:20:00Z'::timestamptz),
  ('James Kariuki', 'Useful snapshot for the civic forums. I would still like a county split before anyone treats this as the final read.', '2026-10-07T14:05:00Z'::timestamptz),
  ('Faith Wanjiru', 'Sharing this with our campaign team. The gap between the top two is small enough that the next event could move it.', '2026-10-06T09:40:00Z'::timestamptz)
) as c(author_name, body, created_at)
where not exists (
  select 1 from public.fusion_poll_comments existing
  where existing.poll_id = p.id and existing.author_name = c.author_name and existing.body = c.body
);

comment on table public.fusion_polls is 'Opinion and politics polls managed from Polling Fx. Public live polls read this table.';
comment on table public.fusion_poll_comments is 'Comments posted on a poll result page.';

do $$ begin raise notice 'Polling Fx tables ready.'; end $$;
