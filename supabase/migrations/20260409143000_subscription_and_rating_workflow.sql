-- Add videos_per_day to packages and implement secure subscription/rating RPC workflows.

alter table public.packages
  add column if not exists videos_per_day int not null default 1;

update public.packages
set videos_per_day = 1
where videos_per_day is null or videos_per_day < 1;

alter table public.packages
  drop constraint if exists packages_videos_per_day_check;

alter table public.packages
  add constraint packages_videos_per_day_check check (videos_per_day > 0);

create or replace function public.purchase_subscription_with_balance(
  p_package_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_package public.packages%rowtype;
  v_profile_balance numeric;
  v_subscription_id uuid;
  v_now timestamptz;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select *
    into v_package
    from public.packages
    where id = p_package_id
      and is_active = true;

  if not found then
    raise exception 'package not found or package is not active' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.user_subscriptions s
    where s.user_id = v_user_id
      and s.status = 'active'
      and s.expires_at is not null
      and s.expires_at > now()
  ) then
    raise exception 'user already has an active subscription' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.user_subscriptions s
    where s.user_id = v_user_id
      and s.status = 'pending'
  ) then
    raise exception 'pending subscription request exists' using errcode = 'P0001';
  end if;

  select p.balance_usdt
    into v_profile_balance
    from public.profiles p
    where p.id = v_user_id
    for update;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  if v_profile_balance < v_package.price_usdt then
    raise exception 'insufficient balance' using errcode = '22003';
  end if;

  update public.profiles
    set balance_usdt = balance_usdt - v_package.price_usdt
    where id = v_user_id;

  v_now := now();

  insert into public.user_subscriptions (
    user_id,
    package_id,
    tx_hash,
    status,
    started_at,
    expires_at,
    created_at
  )
  values (
    v_user_id,
    v_package.id,
    concat('BALANCE-', extract(epoch from clock_timestamp())::bigint, '-', substr(md5(random()::text), 1, 8)),
    'active',
    v_now,
    v_now + make_interval(days => v_package.duration_days),
    v_now
  )
  returning id into v_subscription_id;

  return v_subscription_id;
end;
$$;

revoke all on function public.purchase_subscription_with_balance(uuid) from public;
grant execute on function public.purchase_subscription_with_balance(uuid) to authenticated;

create or replace function public.submit_video_rating(
  p_video_id uuid,
  p_rating int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_video public.videos%rowtype;
  v_subscription record;
  v_earn_per_video numeric;
  v_rating_id uuid;
  v_now timestamptz;
  v_videos_per_day int;
  v_last_rating timestamptz;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_rating < 1 or p_rating > 5 then
    raise exception 'invalid rating' using errcode = '22023';
  end if;

  select *
    into v_video
    from public.videos
    where id = p_video_id
      and is_active = true;

  if not found then
    raise exception 'video is not available' using errcode = 'P0002';
  end if;

  select s.id, p.daily_earnings, p.videos_per_day
    into v_subscription
    from public.user_subscriptions s
    join public.packages p on p.id = s.package_id
    where s.user_id = v_user_id
      and s.status = 'active'
      and s.expires_at is not null
      and s.expires_at > now()
    order by s.expires_at desc
    limit 1;

  if not found then
    raise exception 'active subscription required' using errcode = '42501';
  end if;

  select max(rated_at)
    into v_last_rating
    from public.video_ratings
    where user_id = v_user_id;

  if v_last_rating is not null and now() < v_last_rating + interval '24 hours' then
    raise exception 'you can rate only one video every 24 hours' using errcode = 'P0001';
  end if;

  v_videos_per_day := greatest(coalesce(v_subscription.videos_per_day, 1), 1);
  v_earn_per_video := round((v_subscription.daily_earnings / v_videos_per_day)::numeric, 4);
  v_now := now();

  insert into public.video_ratings (user_id, video_id, rating, earned_usdt, rated_at)
  values (v_user_id, v_video.id, p_rating, v_earn_per_video, v_now)
  returning id into v_rating_id;

  update public.profiles
    set balance_usdt = balance_usdt + v_earn_per_video
    where id = v_user_id;

  insert into public.earnings (user_id, amount_usdt, source, created_at)
  values (v_user_id, v_earn_per_video, 'rating', v_now);

  return jsonb_build_object(
    'rating_id', v_rating_id,
    'earned_usdt', v_earn_per_video,
    'rated_at', v_now,
    'next_available_at', v_now + interval '24 hours'
  );
end;
$$;

revoke all on function public.submit_video_rating(uuid, int) from public;
grant execute on function public.submit_video_rating(uuid, int) to authenticated;
