-- Add network to withdrawals and harden withdrawal workflow.

alter table public.withdrawals
  add column if not exists network text not null default 'trc20';

alter table public.withdrawals
  drop constraint if exists withdrawals_network_check;

alter table public.withdrawals
  add constraint withdrawals_network_check
  check (network in ('trc20', 'bep20'));

create unique index if not exists idx_withdrawals_one_pending_per_user
  on public.withdrawals (user_id)
  where status = 'pending';

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

  if p_amount > v_balance then
    raise exception 'insufficient balance' using errcode = '22003';
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

create or replace function public.process_withdrawal_request(
  p_withdrawal_id uuid,
  p_decision text
)
returns table (
  withdrawal_id uuid,
  status text,
  user_id uuid,
  amount_usdt numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_withdrawal public.withdrawals%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if not public.is_admin() then
    raise exception 'only admins can process withdrawals' using errcode = '42501';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'invalid decision' using errcode = '22023';
  end if;

  select *
    into v_withdrawal
    from public.withdrawals
    where id = p_withdrawal_id
    for update;

  if not found then
    raise exception 'withdrawal not found' using errcode = 'P0002';
  end if;

  if v_withdrawal.status <> 'pending' then
    raise exception 'withdrawal request is not pending' using errcode = 'P0001';
  end if;

  if p_decision = 'approved' then
    update public.profiles
      set balance_usdt = balance_usdt - v_withdrawal.amount_usdt
      where id = v_withdrawal.user_id
        and balance_usdt >= v_withdrawal.amount_usdt;

    if not found then
      raise exception 'insufficient balance' using errcode = '22003';
    end if;
  end if;

  update public.withdrawals
    set status = p_decision,
        processed_at = now()
    where id = v_withdrawal.id;

  return query
  select
    v_withdrawal.id,
    p_decision,
    v_withdrawal.user_id,
    v_withdrawal.amount_usdt;
end;
$$;

revoke all on function public.process_withdrawal_request(uuid, text) from public;
grant execute on function public.process_withdrawal_request(uuid, text) to authenticated;
