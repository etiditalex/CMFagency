-- Prevent duplicate campaigns by title (slug is already unique).
-- Uses lower(trim(title)) so "Old is Gold" and "old is gold" are treated as duplicates.
-- Apply after patch_45. If you have existing duplicate titles, fix or remove them first.
-- -----------------------------------------------------------------------------

-- Unique index on normalized title (case-insensitive, trimmed)
create unique index if not exists campaigns_title_normalized_uniq
  on public.campaigns (lower(trim(title)));

comment on index public.campaigns_title_normalized_uniq is 'Prevent duplicate campaign titles (case-insensitive, trimmed).';
