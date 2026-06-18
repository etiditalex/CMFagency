-- Referrer phone on Lipa Pole Pole plans (name stays in referred_by).
alter table public.cfm_installment_plans
  add column if not exists referrer_phone text;

comment on column public.cfm_installment_plans.referrer_phone is 'Kenya MSISDN (254…) for the person who referred the buyer (required for new plans).';
