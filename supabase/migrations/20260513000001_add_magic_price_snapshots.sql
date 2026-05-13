create table if not exists public.magic_price_snapshots (
  id        uuid primary key default gen_random_uuid(),
  card_id   uuid not null references public.magic_cards(id) on delete cascade,
  date      date not null,
  price_eur numeric(10,4) not null,
  unique(card_id, date)
);

alter table public.magic_price_snapshots enable row level security;

create policy "Users read own magic snapshots"
  on public.magic_price_snapshots for select
  using (
    exists (
      select 1 from public.magic_cards
      where magic_cards.id = magic_price_snapshots.card_id
        and magic_cards.user_id = auth.uid()
    )
  );

create index magic_price_snapshots_card_id_idx on public.magic_price_snapshots(card_id);
create index magic_price_snapshots_date_idx on public.magic_price_snapshots(date);
