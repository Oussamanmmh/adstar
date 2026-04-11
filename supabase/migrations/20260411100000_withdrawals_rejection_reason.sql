-- Add optional rejection reason support for admin withdrawal processing.

alter table public.withdrawals
  add column if not exists rejection_reason text;

drop function if exists public.process_withdrawal_request(uuid, text);

create or replace function public.process_withdrawal_request(
  p_withdrawal_id uuid,
  p_decision text,
  p_rejection_reason text default null
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
  v_reason text;
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

  v_reason := nullif(trim(coalesce(p_rejection_reason, '')), '');

  update public.withdrawals
    set status = p_decision,
        processed_at = now(),
        rejection_reason = case when p_decision = 'rejected' then v_reason else null end
    where id = v_withdrawal.id;

  return query
  select
    v_withdrawal.id,
    p_decision,
    v_withdrawal.user_id,
    v_withdrawal.amount_usdt;
end;
$$;

revoke all on function public.process_withdrawal_request(uuid, text, text) from public;
grant execute on function public.process_withdrawal_request(uuid, text, text) to authenticated;
