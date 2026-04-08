-- Migration: Security hardening for deposits and profiles
-- 1) Restrict balance increment RPC to caller-owned account (or admin) and positive amounts.
-- 2) Prevent non-admin users from changing sensitive profile fields directly.

create or replace function public.increment_balance
(p_user_id uuid, p_amount numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if auth.uid() <> p_user_id and not public.is_admin() then
    raise exception 'Not allowed to increment another user balance' using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero' using errcode = '22023';
  end if;

  update public.profiles
    set balance_usdt = balance_usdt + p_amount
    where id = p_user_id;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.increment_balance(uuid, numeric) from public;
grant execute on function public.increment_balance(uuid, numeric) to authenticated;

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

  return new;
end;
$$;

drop trigger if exists trg_prevent_sensitive_profile_updates on public.profiles;
create trigger trg_prevent_sensitive_profile_updates
  before update on public.profiles
  for each row
  execute function public.prevent_sensitive_profile_updates();
