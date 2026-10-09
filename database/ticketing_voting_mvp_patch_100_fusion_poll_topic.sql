-- Polls created on the public poll page use topic 'poll'.
-- Opinion polls stay topic 'opinion' and are a separate feature.
-- Apply in the Supabase SQL editor.

alter table public.fusion_polls drop constraint if exists fusion_polls_topic_check;

alter table public.fusion_polls
  add constraint fusion_polls_topic_check
  check (topic in ('poll','brand','politics','presidential','gubernatorial','senatorial','events','opinion','campaign'));
