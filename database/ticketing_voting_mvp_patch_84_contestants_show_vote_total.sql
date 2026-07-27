alter table public.contestants
  add column if not exists show_vote_total boolean not null default true;

comment on column public.contestants.show_vote_total is 'Whether public vote totals for this contestant should be visible on the voting page.';
