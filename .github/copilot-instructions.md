# Adstar — Copilot Project Instructions

## 🧠 Project Overview

Adstar is a full-stack web app where users subscribe in arabic (pay in TRC20 USDT), rate 1 video per day, earn USDT rewards, and withdraw earnings. Admins manage users, payments, videos, and withdrawals.

## 🛠️ Tech Stack

- **Framework:** Next.js 14 App Router (TypeScript)
- **Database + Auth:** Supabase (PostgreSQL + Supabase Auth + RLS)
- **Styling:** Tailwind CSS + shadcn/ui
- **Language:** TypeScript (strict mode)
- **Package manager:** pnpm

## 🗄️ Supabase Tables

- **profiles** — id, full_name, email, wallet_address, balance_usdt, is_admin, created_at
- **packages** — id, name, price_usdt, daily_earnings, duration_days, is_active
- **user_subscriptions** — id, user_id, package_id, tx_hash, status (pending/active/expired), started_at, expires_at
- **videos** — id, title, youtube_url, thumbnail_url, order_index, is_active
- **video_ratings** — id, user_id, video_id, rating (1-5), earned_usdt, rated_at
- **earnings** — id, user_id, amount_usdt, source, created_at
- **withdrawals** — id, user_id, amount_usdt, wallet_address, status (pending/approved/rejected), requested_at, processed_at

## 🔐 Auth & Roles

- Auth via Supabase Auth
- `is_admin = true` in profiles → access to /admin routes
- All /dashboard routes require active session
- All /admin routes require is_admin check in middleware
- Use Supabase RLS on all tables

## 💳 USDT Payment Flow (TRC20)

1. User picks a package → sees client TRC20 wallet + amount
2. User sends USDT via Trust Wallet
3. User pastes TxHash in the app
4. App calls TronGrid API to verify the transaction:
   - Endpoint: GET https://api.trongrid.io/v1/transactions/{txHash}
   - Verify: correct recipient wallet, correct amount, tx not already used
5. If valid → subscription activated, status = active
6. If invalid → show error

## 🎬 Video Rating Rules

- User can rate exactly 1 video per 24 hours
- After rating → add package.daily_earnings to profiles.balance_usdt
- Insert row into video_ratings and earnings tables
- Show countdown timer for next available rating
- Videos are rotated in order by order_index
- Only users with active subscription can rate

## 💸 Withdrawal Rules

- User enters amount + their TRC20 wallet address
- Creates withdrawal row with status = pending
- Admin approves or rejects from /admin/withdrawals
- On approve → deduct from profiles.balance_usdt
- Minimum withdrawal: $5 USDT

## 🎨 Design System

- Dark theme: background #0A0A0F, cards #13131A
- Accent: Gold #F5C518
- Font: Inter
- Fully responsive (mobile first)
- the website must be in arabic language

## ✅ Coding Rules (follow strictly)

- Always use TypeScript with proper interfaces from /types
- Always use Server Components by default, Client Components only when needed (useState, useEffect, event handlers)
- All database calls go through Supabase server client (not browser client) in Server Components
- Never expose service role key on client side
- Use React Server Actions for form submissions
- Always handle loading, error, and empty states
- Use Zod for form validation
- Use toast (sonner) for all user feedback
- Keep components small and focused (single responsibility)
- Supabase RLS must be enabled — never bypass it
- add skeleton loaders for all async data fetching

## 📦 Key Dependencies

- @supabase/supabase-js
- @supabase/ssr
- shadcn/ui
- sonner (toasts)
- zod
- next-intl
- lucide-react
- date-fns (for timer/date formatting)
