-- Referral system: unique referral codes, inviter tracking, and first-deposit reward payout.

-- 1) Profiles: referral fields
alter table public.profiles
  add column if not exists referral_code text,
  add column if not exists referred_by uuid references public.profiles(id),
  add column if not exists referred_at timestamptz;

create or replace function public.generate_referral_code()
returns text
language sql
volatile
set search_path = public, extensions
as $$
  select upper(substring(encode(extensions.gen_random_bytes(6), 'hex') from 1 for 8));
$$;

create or replace function public.generate_unique_referral_code()
returns text
language plpgsql
volatile
set search_path = public, extensions
as $$
declare
  v_code text;
begin
  loop
    v_code := public.generate_referral_code();

    if not exists (
      select 1
      from public.profiles p
      where p.referral_code = v_code
    ) then
      return v_code;
    end if;
  end loop;
end;
$$;

update public.profiles
set referral_code = public.generate_unique_referral_code()
where referral_code is null or btrim(referral_code) = '';

update public.profiles
set referral_code = upper(btrim(referral_code))
where referral_code is not null;

create unique index if not exists idx_profiles_referral_code on public.profiles (referral_code);
create index if not exists idx_profiles_referred_by on public.profiles (referred_by);

alter table public.profiles
  alter column referral_code set not null;

alter table public.profiles
  drop constraint if exists profiles_referral_code_format,
  add constraint profiles_referral_code_format check (referral_code ~ '^[A-Z0-9]{8}$');

alter table public.profiles
  drop constraint if exists profiles_referred_by_not_self,
  add constraint profiles_referred_by_not_self check (referred_by is null or referred_by <> id);

-- 2) Update new-user trigger function to attach inviter from metadata referral code.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral_code text;
  v_referral_input text;
  v_inviter_id uuid;
begin
  v_referral_code := public.generate_unique_referral_code();
  v_referral_input := upper(nullif(trim(new.raw_user_meta_data->>'referral_code'), ''));

  if v_referral_input is not null then
    select p.id
      into v_inviter_id
    from public.profiles p
    where p.referral_code = v_referral_input
    limit 1;
  end if;

  if v_inviter_id = new.id then
    v_inviter_id := null;
  end if;

  insert into public.profiles (id, email, full_name, referral_code, referred_by, referred_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    v_referral_code,
    v_inviter_id,
    case when v_inviter_id is not null then now() else null end
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
        referral_code = coalesce(public.profiles.referral_code, excluded.referral_code),
        referred_by = coalesce(public.profiles.referred_by, excluded.referred_by),
        referred_at = coalesce(public.profiles.referred_at, excluded.referred_at);

  return new;
end;
$$;

-- 3) Referral reward audit table: one reward per referred user (first confirmed deposit only).
create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid not null references public.profiles(id) on delete cascade,
  deposit_id uuid not null references public.deposits(id) on delete cascade,
  deposit_amount_usdt numeric(10,2) not null check (deposit_amount_usdt > 0),
  reward_percent numeric(5,2) not null default 10.00 check (reward_percent > 0),
  reward_amount_usdt numeric(10,2) not null check (reward_amount_usdt > 0),
  created_at timestamptz not null default now(),
  constraint referral_rewards_referred_user_unique unique (referred_user_id),
  constraint referral_rewards_deposit_unique unique (deposit_id),
  constraint referral_rewards_no_self check (inviter_user_id <> referred_user_id)
);

create index if not exists idx_referral_rewards_inviter_created
  on public.referral_rewards (inviter_user_id, created_at desc);

alter table public.referral_rewards enable row level security;

grant select on public.referral_rewards to authenticated;

drop policy if exists "Users view own referral rewards" on public.referral_rewards;
create policy "Users view own referral rewards"
  on public.referral_rewards for select
  using (auth.uid() = inviter_user_id or auth.uid() = referred_user_id or public.is_admin());

-- 4) Atomic flow for confirmed deposits, including first-deposit referral payout.
create or replace function public.apply_confirmed_deposit(
  p_user_id uuid,
  p_network text,
  p_tx_hash text,
  p_amount numeric,
  p_confirmed_at timestamptz default now()
)
returns table (
  deposit_id uuid,
  reward_applied boolean,
  reward_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deposit_id uuid;
  v_inviter_id uuid;
  v_referral_reward_id uuid;
  v_reward_candidate numeric(10,2);
  v_reward_paid numeric(10,2) := 0;
  v_reward_applied boolean := false;
begin
  if coalesce(auth.role(), '') not in ('service_role', '') then
    if auth.uid() is null then
      raise exception 'Authentication required' using errcode = '42501';
    end if;

    if auth.uid() <> p_user_id and not public.is_admin() then
      raise exception 'Not allowed to apply deposit for another user' using errcode = '42501';
    end if;
  end if;

  if p_network not in ('trc20', 'bep20') then
    raise exception 'Invalid network' using errcode = '22023';
  end if;

  if p_tx_hash is null or btrim(p_tx_hash) = '' then
    raise exception 'Transaction hash is required' using errcode = '22023';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero' using errcode = '22023';
  end if;

  insert into public.deposits (user_id, network, tx_hash, amount_usdt, status, confirmed_at)
  values (p_user_id, p_network, p_tx_hash, p_amount, 'confirmed', p_confirmed_at)
  returning id into v_deposit_id;

  update public.profiles
  set balance_usdt = balance_usdt + p_amount
  where id = p_user_id;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  insert into public.earnings (user_id, amount_usdt, source)
  values (p_user_id, p_amount, 'deposit');

  select p.referred_by
    into v_inviter_id
  from public.profiles p
  where p.id = p_user_id;

  v_reward_candidate := trunc(p_amount * 0.10, 2);

  if v_inviter_id is not null
     and v_inviter_id <> p_user_id
     and v_reward_candidate > 0 then
    insert into public.referral_rewards (
      inviter_user_id,
      referred_user_id,
      deposit_id,
      deposit_amount_usdt,
      reward_percent,
      reward_amount_usdt
    )
    values (
      v_inviter_id,
      p_user_id,
      v_deposit_id,
      p_amount,
      10.00,
      v_reward_candidate
    )
    on conflict (referred_user_id) do nothing
    returning id into v_referral_reward_id;

    if v_referral_reward_id is not null then
      update public.profiles
      set balance_usdt = balance_usdt + v_reward_candidate
      where id = v_inviter_id;

      insert into public.earnings (user_id, amount_usdt, source)
      values (v_inviter_id, v_reward_candidate, 'referral_first_deposit');

      v_reward_applied := true;
      v_reward_paid := v_reward_candidate;
    end if;
  end if;

  return query
    select v_deposit_id, v_reward_applied, v_reward_paid;
end;
$$;

revoke all on function public.apply_confirmed_deposit(uuid, text, text, numeric, timestamptz) from public;
grant execute on function public.apply_confirmed_deposit(uuid, text, text, numeric, timestamptz) to authenticated;
grant execute on function public.apply_confirmed_deposit(uuid, text, text, numeric, timestamptz) to service_role;

-- 5) Extend profile update guard to keep referral ownership immutable for users.
create or replace function public.prevent_sensitive_profile_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' or public.is_admin() then
    return new;
  end if;

  if new.balance_usdt is distinct from old.balance_usdt then
    raise exception 'Updating balance_usdt directly is not allowed' using errcode = '42501';
  end if;

  if new.is_admin is distinct from old.is_admin then
    raise exception 'Updating is_admin directly is not allowed' using errcode = '42501';
  end if;

  if new.referral_code is distinct from old.referral_code then
    raise exception 'Updating referral_code directly is not allowed' using errcode = '42501';
  end if;

  if new.referred_by is distinct from old.referred_by then
    raise exception 'Updating referred_by directly is not allowed' using errcode = '42501';
  end if;

  if new.referred_at is distinct from old.referred_at then
    raise exception 'Updating referred_at directly is not allowed' using errcode = '42501';
  end if;

  return new;
end;
$$;
