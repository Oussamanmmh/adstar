-- Update packages catalog to the 9 new tiers.
-- This migration is for existing databases where the initial seed already ran.

insert into public.packages
    (name, price_usdt, daily_earnings, duration_days, is_active)
values
    ('باقة 40', 40, 10.0000, 30, true),
    ('باقة 200', 200, 40.0000, 30, true),
    ('باقة 600', 600, 150.0000, 30, true),
    ('باقة 900', 900, 250.0000, 30, true),
    ('باقة 1500', 1500, 500.0000, 30, true),
    ('باقة 2200', 2200, 800.0000, 30, true),
    ('باقة 3000', 3000, 1070.0000, 30, true),
    ('باقة 5000', 5000, 3090.0000, 30, true),
    ('باقة 10000', 10000, 8000.0000, 30, true)
on conflict
(name)
do
update set
  price_usdt = excluded.price_usdt,
  daily_earnings = excluded.daily_earnings,
  duration_days = excluded.duration_days,
  is_active = excluded.is_active;

update public.packages
set is_active = false
where name not in (
  'باقة 40',
  'باقة 200',
  'باقة 600',
  'باقة 900',
  'باقة 1500',
  'باقة 2200',
  'باقة 3000',
  'باقة 5000',
  'باقة 10000'
);
