-- PokeVault initial schema

-- Collection cards
create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Card identity
  name text not null,
  set_id text not null,
  set_name text not null,
  set_code text not null,
  card_number text not null,
  api_id text,
  api_source text not null default 'manual', -- 'pokemontcg' | 'tcgdex' | 'manual'
  image_url text,

  -- Card attributes
  element text,
  rarity text,
  language text not null default 'EN',

  -- Acquisition details
  condition numeric(3, 1) not null check (condition >= 1 and condition <= 10),
  cost_basis numeric(10, 2) not null default 0,
  source text not null default 'Altro',
  acquired_date date not null,
  notes text,
  is_favorite boolean not null default false
);

-- Daily price snapshots per card (EUR primary, USD optional)
create table if not exists price_snapshots (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references cards(id) on delete cascade,
  date date not null,
  price_eur numeric(10, 4) not null,
  price_usd numeric(10, 4),
  unique (card_id, date)
);

-- Indexes for common query patterns
create index if not exists idx_cards_set_id on cards(set_id);
create index if not exists idx_cards_language on cards(language);
create index if not exists idx_cards_is_favorite on cards(is_favorite) where is_favorite = true;
create index if not exists idx_price_snapshots_card_date on price_snapshots(card_id, date desc);
