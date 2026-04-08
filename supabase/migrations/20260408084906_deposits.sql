-- Migration: Add deposits table + atomic balance increment function

-- DEPOSITS TABLE
create table
if not exists public.deposits
(
  id            uuid        primary key default gen_random_uuid
(),
  user_id       uuid        not null references public.profiles
(id) on
delete cascade,
  network       text
not null check
(network in
('trc20', 'bep20')),
  tx_hash       text        not null unique,
  amount_usdt   numeric
(10,2) not null check
(amount_usdt >= 1),
  status        text        not null default 'confirmed' check
(status in
('confirmed', 'failed')),
  confirmed_at  timestamptz not null default now
(),
  created_at    timestamptz not null default now
()
);

create index
if not exists idx_deposits_user_id    on public.deposits
(user_id);
create index
if not exists idx_deposits_tx_hash    on public.deposits
(tx_hash);
create index
if not exists idx_deposits_status     on public.deposits
(status);
create index
if not exists idx_deposits_created_at on public.deposits
(user_id, created_at desc);

-- RLS
alter table public.deposits enable row level security;

grant select, insert on public.deposits to authenticated;

drop policy
if exists "Users view own deposits" on public.deposits;
create policy "Users view own deposits"
  on public.deposits for
select
    using (auth.uid() = user_id or public.is_admin());

drop policy
if exists "Users insert own deposits" on public.deposits;
create policy "Users insert own deposits"
  on public.deposits for
insert
  with check (auth.uid() =
user_id);

drop policy
if exists "Admins manage deposits" on public.deposits;
create policy "Admins manage deposits"
  on public.deposits for
update
  using  (public.is_admin()
)
  with check
(public.is_admin
());

-- Atomic balance increment — avoids race conditions from read-modify-write in app layer.
create or replace function public.increment_balance
(p_user_id uuid, p_amount numeric)
returns void
language sql
security definer
set search_path
= public
as $$
update public.profiles
  set balance_usdt = balance_usdt + p_amount
  where id = p_user_id;
$$;

revoke all on function public.increment_balance
(uuid, numeric) from public;
grant execute on function public.increment_balance
(uuid, numeric) to authenticated;