-- Initial schema for Adstar
-- Safe to run once via Supabase migrations.

create extension
if not exists pgcrypto
with schema extensions;

-- PROFILES (extends auth.users)
create table
if not exists public.profiles
(
  id uuid primary key references auth.users
(id) on
delete cascade,
  full_name text,
  email text,
  wallet_address text,
  balance_usdt numeric
(10,2) not null default 0 check
(balance_usdt >= 0),
  is_admin boolean not null default false,
  created_at timestamptz not null default now
()
);

create index
if not exists idx_profiles_is_admin on public.profiles
(is_admin);

-- Helper to evaluate admin role inside RLS without recursive policy checks.
create or replace function public.is_admin
()
returns boolean
language sql
stable
security definer
set search_path
= public
as $$
select exists
(
    select 1
from public.profiles p
where p.id = auth.uid()
    and p.is_admin = true
  );
$$;

revoke all on function public.is_admin
() from public;
grant execute on function public.is_admin
() to authenticated;

-- Auto-create profile on user signup.
create or replace function public.handle_new_user
()
returns trigger
language plpgsql
security definer
set search_path
= public
as $$
begin
    insert into public.profiles
        (id, email, full_name)
    values
        (
            new.id,
            new.email,
            coalesce(new.raw_user_meta_data->>'full_name', '')
  )
    on conflict
    (id) do nothing;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created
on auth.users;
create trigger on_auth_user_created
  after
insert on
auth.users
for each row
execute function
public.handle_new_user
();

-- PACKAGES
create table
if not exists public.packages
(
  id uuid primary key default gen_random_uuid
(),
  name text not null unique,
  price_usdt numeric
(10,2) not null check
(price_usdt > 0),
  daily_earnings numeric
(10,4) not null check
(daily_earnings > 0),
  duration_days int not null check
(duration_days > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now
()
);

-- Insert the default 3 packages.
insert into public.packages
    (name, price_usdt, daily_earnings, duration_days)
values
    ('Basic', 20, 1.0000, 30),
    ('Standard', 50, 3.0000, 30),
    ('Pro', 100, 7.0000, 30)
on conflict
(name)
do
update set
  price_usdt = excluded.price_usdt,
  daily_earnings = excluded.daily_earnings,
  duration_days = excluded.duration_days;

-- USER SUBSCRIPTIONS
create table
if not exists public.user_subscriptions
(
  id uuid primary key default gen_random_uuid
(),
  user_id uuid not null references public.profiles
(id) on
delete cascade,
  package_id uuid
not null references public.packages
(id),
  tx_hash text unique,
  status text not null default 'pending' check
(status in
('pending', 'active', 'expired')),
  started_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now
(),
  constraint tx_hash_not_blank check
(tx_hash is null or length
(trim
(tx_hash)) > 0),
  constraint active_dates_required check
(
    status <> 'active' or
(started_at is not null and expires_at is not null and expires_at > started_at)
  )
);

create index
if not exists idx_user_subscriptions_user_id on public.user_subscriptions
(user_id);
create index
if not exists idx_user_subscriptions_status on public.user_subscriptions
(status);
create index
if not exists idx_user_subscriptions_expires_at on public.user_subscriptions
(expires_at);

-- VIDEOS
create table
if not exists public.videos
(
  id uuid primary key default gen_random_uuid
(),
  title text not null,
  youtube_url text not null,
  thumbnail_url text,
  order_index int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now
()
);

create index
if not exists idx_videos_is_active_order on public.videos
(is_active, order_index);

-- VIDEO RATINGS
create table
if not exists public.video_ratings
(
  id uuid primary key default gen_random_uuid
(),
  user_id uuid not null references public.profiles
(id) on
delete cascade,
  video_id uuid
not null references public.videos
(id),
  rating int not null check
(rating between 1 and 5),
  earned_usdt numeric
(10,4) not null default 0 check
(earned_usdt >= 0),
  rated_at timestamptz not null default now
()
);

create index
if not exists idx_video_ratings_user_rated_at on public.video_ratings
(user_id, rated_at desc);
create index
if not exists idx_video_ratings_video_id on public.video_ratings
(video_id);

create or replace function public.enforce_rating_cooldown
()
returns trigger
language plpgsql
security definer
set search_path
= public
as $$
declare
  last_rated_at timestamptz;
begin
    select max(vr.rated_at)
    into last_rated_at
    from public.video_ratings vr
    where vr.user_id = new.user_id;

    if last_rated_at is not null and new.rated_at < last_rated_at + interval '24 hours' then
    raise exception 'You can rate only one video every 24 hours.' using errcode = '23514';
end
if;

  return new;
end;
$$;

drop trigger if exists enforce_rating_cooldown_trigger
on public.video_ratings;
create trigger enforce_rating_cooldown_trigger
  before
insert on public.
video_ratings
for
each
row
execute function
public.enforce_rating_cooldown
();

-- EARNINGS
create table
if not exists public.earnings
(
  id uuid primary key default gen_random_uuid
(),
  user_id uuid not null references public.profiles
(id) on
delete cascade,
  amount_usdt numeric(10,4)
not null check
(amount_usdt >= 0),
  source text not null default 'rating',
  created_at timestamptz not null default now
()
);

create index
if not exists idx_earnings_user_created_at on public.earnings
(user_id, created_at desc);

-- WITHDRAWALS
create table
if not exists public.withdrawals
(
  id uuid primary key default gen_random_uuid
(),
  user_id uuid not null references public.profiles
(id) on
delete cascade,
  amount_usdt numeric(10,2)
not null check
(amount_usdt >= 5),
  wallet_address text not null,
  status text not null default 'pending' check
(status in
('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now
(),
  processed_at timestamptz,
  constraint processed_at_for_decision check
(
    status = 'pending' or processed_at is not null
  )
);

create index
if not exists idx_withdrawals_user_requested_at on public.withdrawals
(user_id, requested_at desc);
create index
if not exists idx_withdrawals_status on public.withdrawals
(status);

-- Enable RLS on all app tables.
alter table public.profiles enable row level security;
alter table public.packages enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.videos enable row level security;
alter table public.video_ratings enable row level security;
alter table public.earnings enable row level security;
alter table public.withdrawals enable row level security;

-- Grants (RLS still applies for anon/authenticated).
grant select on public.packages to anon, authenticated;
grant select on public.videos to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.user_subscriptions to authenticated;
grant select, insert, update, delete on public.video_ratings to authenticated;
grant select on public.earnings to authenticated;
grant select, insert, update, delete on public.withdrawals to authenticated;

-- PROFILES policies.
drop policy
if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for
select
    using (auth.uid() = id or public.is_admin());

drop policy
if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for
update
  using (auth.uid()
= id or public.is_admin
())
  with check
(auth.uid
() = id or public.is_admin
());

-- PACKAGES policies.
drop policy
if exists "Anyone can view packages" on public.packages;
create policy "Anyone can view packages"
  on public.packages for
select
    using (true);

drop policy
if exists "Admins manage packages" on public.packages;
create policy "Admins manage packages"
  on public.packages for all
  using
(public.is_admin
())
  with check
(public.is_admin
());

-- VIDEOS policies.
drop policy
if exists "Anyone can view active videos" on public.videos;
create policy "Anyone can view active videos"
  on public.videos for
select
    using (is_active = true or public.is_admin());

drop policy
if exists "Admins manage videos" on public.videos;
create policy "Admins manage videos"
  on public.videos for all
  using
(public.is_admin
())
  with check
(public.is_admin
());

-- USER SUBSCRIPTIONS policies.
drop policy
if exists "Users view own subscriptions" on public.user_subscriptions;
create policy "Users view own subscriptions"
  on public.user_subscriptions for
select
    using (auth.uid() = user_id or public.is_admin());

drop policy
if exists "Users insert own subscriptions" on public.user_subscriptions;
create policy "Users insert own subscriptions"
  on public.user_subscriptions for
insert
  with check (auth.uid() = user_id or public.is_admin())
;

drop policy
if exists "Users update own subscriptions" on public.user_subscriptions;
create policy "Users update own subscriptions"
  on public.user_subscriptions for
update
  using (auth.uid()
= user_id or public.is_admin
())
  with check
(auth.uid
() = user_id or public.is_admin
());

-- VIDEO RATINGS policies.
drop policy
if exists "Users view own ratings" on public.video_ratings;
create policy "Users view own ratings"
  on public.video_ratings for
select
    using (auth.uid() = user_id or public.is_admin());

drop policy
if exists "Users insert own ratings" on public.video_ratings;
create policy "Users insert own ratings"
  on public.video_ratings for
insert
  with check (auth.uid() = user_id or public.is_admin())
;

-- EARNINGS policies.
drop policy
if exists "Users view own earnings" on public.earnings;
create policy "Users view own earnings"
  on public.earnings for
select
    using (auth.uid() = user_id or public.is_admin());

drop policy
if exists "Admins manage earnings" on public.earnings;
create policy "Admins manage earnings"
  on public.earnings for all
  using
(public.is_admin
())
  with check
(public.is_admin
());

-- WITHDRAWALS policies.
drop policy
if exists "Users view own withdrawals" on public.withdrawals;
create policy "Users view own withdrawals"
  on public.withdrawals for
select
    using (auth.uid() = user_id or public.is_admin());

drop policy
if exists "Users insert own withdrawals" on public.withdrawals;
create policy "Users insert own withdrawals"
  on public.withdrawals for
insert
  with check (auth.uid() = user_id or public.is_admin())
;

drop policy
if exists "Admins manage withdrawals" on public.withdrawals;
create policy "Admins manage withdrawals"
  on public.withdrawals for
update
  using (public.is_admin()
)
  with check
(public.is_admin
());
