-- CFMA 2026 voting categories for "Register as a Model".
-- Creates one vote campaign per category. Run after ticketing_voting_mvp.sql and patch_34 (contestants email).
-- created_by is set to the first auth user (ensure at least one admin exists before running).

insert into public.campaigns (
  type,
  slug,
  title,
  description,
  currency,
  unit_amount,
  max_per_txn,
  is_active,
  created_by
)
select
  'vote'::public.campaign_type,
  c.slug,
  c.title,
  'Vote for your favourite in this category. CFMA 2026.'::text,
  'KES',
  10,
  1000000,
  true,
  (select id from auth.users order by created_at asc limit 1)
from (values
  ('rising-star-model-of-the-year', 'Rising Star Model of the Year'),
  ('most-talented-model-of-the-year', 'Most Talented Model of the Year'),
  ('best-pwd-model-of-the-year', 'Best PWD Model of the Year'),
  ('best-model-in-community-service', 'Best Model in Community Service'),
  ('muslim-model-of-the-year', 'Muslim Model of the Year'),
  ('most-influential-male-model-of-the-year', 'Most Influential Male Model of the Year'),
  ('most-influential-female-model-of-the-year', 'Most Influential Female Model of the Year'),
  ('high-fashion-model-of-the-year', 'High Fashion Model of the Year'),
  ('photogenic-model-of-the-year', 'Photogenic Model of the Year'),
  ('plus-size-model-of-the-year', 'Plus Size Model of the Year'),
  ('peoples-choice-award', 'People''s Choice Award'),
  ('ambassador-of-coastal-heritage', 'Ambassador of Coastal Heritage'),
  ('best-master-of-ceremonies-mc-of-the-year', 'Best Master of Ceremonies (MC) of the Year'),
  ('best-spoken-word-artist-of-the-year', 'Best Spoken Word Artist of the Year'),
  ('best-dressed-creative-of-the-year', 'Best Dressed Creative of the Year'),
  ('best-makeup-artist-of-the-year', 'Best Makeup Artist of the Year'),
  ('best-fashion-stylist-of-the-year', 'Best Fashion Stylist of the Year'),
  ('best-fashion-house-of-the-year', 'Best Fashion House of the Year'),
  ('designer-of-the-year', 'Designer of the Year'),
  ('best-dj-of-the-year', 'Best DJ of the Year'),
  ('best-rapper-of-the-year', 'Best Rapper of the Year'),
  ('best-music-band-of-the-year', 'Best Music Band of the Year'),
  ('best-photographer-of-the-year', 'Best Photographer of the Year'),
  ('best-pageant-trainer-of-the-year', 'Best Pageant Trainer of the Year'),
  ('most-stylish-model-of-the-year', 'Most Stylish Model of the Year'),
  ('most-innovative-model-of-the-year', 'Most Innovative Model of the Year'),
  ('tiktoker-of-the-year', 'TikToker of the Year'),
  ('teen-model-of-the-year', 'Teen Model of the Year'),
  ('pageant-of-the-year', 'Pageant of the Year'),
  ('best-creative-agency-of-the-year', 'Best Creative Agency of the Year'),
  ('best-event-organizers-of-the-year', 'Best Event Organizer(s) of the Year'),
  ('dancer-dance-crew-of-the-year', 'Dancer/Dance crew of the year'),
  ('content-creator-influencer-of-the-year', 'Content creator/influencer of the year')
) as c(slug, title)
on conflict (slug) do nothing;
