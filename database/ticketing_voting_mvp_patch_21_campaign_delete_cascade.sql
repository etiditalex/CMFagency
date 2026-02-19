-- Allow deleting campaigns that have transactions.
-- Previously: transactions.campaign_id had ON DELETE RESTRICT, blocking campaign deletion.
-- Now: ON DELETE CASCADE - deleting a campaign also deletes its related transactions.
-- Use with care: this removes transaction history for the deleted campaign.
-- -----------------------------------------------------------------------------

alter table public.transactions
  drop constraint if exists transactions_campaign_id_fkey;

alter table public.transactions
  add constraint transactions_campaign_id_fkey
  foreign key (campaign_id)
  references public.campaigns(id)
  on delete cascade;
