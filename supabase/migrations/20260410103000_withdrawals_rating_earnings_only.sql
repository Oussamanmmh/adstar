-- Restrict withdrawals to rating earnings only (exclude deposited funds).

create or replace function public.request_withdrawal(
  p_network text,
  p_wallet_address text,
  p_amount numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_balance numeric;
  v_total_rating_earnings numeric;
  v_withdrawn_or_pending numeric;
  v_withdrawable_from_ratings numeric;
  v_withdrawal_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_network not in ('trc20', 'bep20') then
    raise exception 'invalid network' using errcode = '22023';
  end if;

  if p_wallet_address is null or length(trim(p_wallet_address)) < 20 then
    raise exception 'invalid wallet address' using errcode = '22023';
  end if;

  if p_amount is null or p_amount < 5 then
    raise exception 'minimum withdrawal amount is 5 usdt' using errcode = '22023';
  end if;

  select balance_usdt
    into v_balance
    from public.profiles
    where id = v_user_id
    for update;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  -- Keep this check so approved withdrawals cannot exceed current balance.
  if p_amount > v_balance then
    raise exception 'insufficient balance' using errcode = '22003';
  end if;

  select coalesce(sum(e.amount_usdt), 0)
    into v_total_rating_earnings
    from public.earnings e
    where e.user_id = v_user_id
      and e.source = 'rating';

  select coalesce(sum(w.amount_usdt), 0)
    into v_withdrawn_or_pending
    from public.withdrawals w
    where w.user_id = v_user_id
      and w.status in ('pending', 'approved');

  v_withdrawable_from_ratings := greatest(v_total_rating_earnings - v_withdrawn_or_pending, 0);

  if p_amount > v_withdrawable_from_ratings then
    raise exception 'insufficient withdrawable rating earnings' using errcode = '22003';
  end if;

  if exists (
    select 1
    from public.withdrawals w
    where w.user_id = v_user_id
      and w.status = 'pending'
  ) then
    raise exception 'pending withdrawal request already exists' using errcode = 'P0001';
  end if;

  insert into public.withdrawals (
    user_id,
    amount_usdt,
    wallet_address,
    network,
    status,
    requested_at
  )
  values (
    v_user_id,
    p_amount,
    trim(p_wallet_address),
    p_network,
    'pending',
    now()
  )
  returning id into v_withdrawal_id;

  return v_withdrawal_id;
end;
$$;

revoke all on function public.request_withdrawal(text, text, numeric) from public;
grant execute on function public.request_withdrawal(text, text, numeric) to authenticated;
