-- Add ban status to profiles for admin moderation.

alter table public.profiles
  add column if not exists is_banned boolean not null default false;

create index if not exists idx_profiles_is_banned on public.profiles (is_banned);
