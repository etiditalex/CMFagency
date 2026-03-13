-- One registration per email per category (contestants can register in multiple categories, but not twice in the same one).
-- Run after: ticketing_voting_mvp_patch_34_contestants_email_voting_link.sql

create unique index if not exists contestants_campaign_email_lower_uniq
  on public.contestants (campaign_id, lower(email))
  where email is not null;

comment on index public.contestants_campaign_email_lower_uniq is 'One contestant per email per category; allows same person in different categories.';
