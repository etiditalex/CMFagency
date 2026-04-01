-- CMF Agency — Set vote campaigns to KES 10 per vote (whole shillings).
-- `unit_amount` is stored in main currency units; Paystack/Daraja multiply by 100 for kobo/cents.
--
-- `/api/voting/all-categories` avoids DB statement timeouts by using SUPABASE_SERVICE_ROLE_KEY on the
-- server (same as webhooks). Ensure that env var is set on Vercel so the catalog route bypasses slow
-- per-row RLS on `contestants`.
--
-- Run in Supabase SQL Editor after reviewing row count:
--   SELECT id, slug, title, unit_amount FROM public.campaigns WHERE type = 'vote';
--
-- Then:
begin;

update public.campaigns
set unit_amount = 10
where type = 'vote';

commit;

do $$ begin raise notice 'Vote campaigns unit_amount set to 10 KES.'; end $$;
