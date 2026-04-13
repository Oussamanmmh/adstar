-- Allow service_role (server webhooks) to increment balances via RPC.
-- Keep strict checks for authenticated end users.

create or replace function public.increment_balance
(p_user_id uuid, p_amount numeric)
returns void
language plpgsql
security definer
set search_path
= public
as $$
begin
    -- Webhook/server flows run as service_role.
    -- Direct SQL sessions can have empty JWT role; treat them as trusted operators.
    if coalesce(auth.role(), '') not in ('service_role', '') then
    if auth.uid() is null then
      raise exception 'Authentication required' using errcode = '42501';
end
if;

    if auth.uid() <> p_user_id and not public.is_admin() then
      raise exception 'Not allowed to increment another user balance' using errcode = '42501';
end
if;
  end
if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero' using errcode = '22023';
end
if;

  update public.profiles
    set balance_usdt = balance_usdt + p_amount
    where id = p_user_id;

if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
end
if;
end;
$$;

revoke all on function public.increment_balance
(uuid, numeric) from public;
grant execute on function public.increment_balance
(uuid, numeric) to authenticated;
grant execute on function public.increment_balance
(uuid, numeric) to service_role;
