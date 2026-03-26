-- Add client-side id + day bucket to prevent spam (1 vote per client per day)
alter table public.preferred_channel_votes
  add column if not exists client_id text,
  add column if not exists vote_day date not null default (now() at time zone 'utc')::date;

create index if not exists preferred_channel_votes_vote_day_idx
  on public.preferred_channel_votes (vote_day desc);

-- Unique per client per day (allows changing channel by updating policy later if needed)
create unique index if not exists preferred_channel_votes_client_day_uniq
  on public.preferred_channel_votes (client_id, vote_day)
  where client_id is not null;

