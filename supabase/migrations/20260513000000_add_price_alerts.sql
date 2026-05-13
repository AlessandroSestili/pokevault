create table if not exists public.price_alerts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  card_id          uuid not null,
  game             text not null check (game in ('pokemon', 'magic')),
  threshold_eur    numeric(10,2) not null check (threshold_eur > 0),
  last_triggered_price numeric(10,4),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.price_alerts enable row level security;

create policy "Users manage own alerts"
  on public.price_alerts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index price_alerts_user_id_idx on public.price_alerts(user_id);
create index price_alerts_card_id_idx on public.price_alerts(card_id);
