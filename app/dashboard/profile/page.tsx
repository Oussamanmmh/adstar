'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Globe, Lock, Shield, UserPlus, HelpCircle, Headphones,
  Languages, Bell, LogOut, ChevronLeft, Copy, CheckCheck,
  Wallet, TrendingUp, ArrowDownToLine, Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const supabase = getSupabaseBrowserClient()

const defaultStats = {
  totalIncome: 0,
  pendingWithdraw: 0,
}

function StatCard({ label, value, icon: Icon, accent = false }: {
  label: string; value: string; icon: React.ElementType; accent?: boolean
}) {
  return (
    <div className={cn(
      'relative flex flex-col gap-1.5 rounded-2xl border p-4 overflow-hidden',
      accent ? 'border-cyan/40 bg-cyan/10' : 'border-border bg-card'
    )}>
      {accent && <span className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-cyan/20 blur-2xl" />}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <Icon size={14} className={accent ? 'text-cyan' : 'text-muted-foreground'} />
      </div>
      <p className={cn('text-xl font-bold tracking-tight font-mono', accent ? 'text-cyan' : 'text-foreground')}>
        {value}
        <span className="ml-1 text-xs font-normal text-muted-foreground">USDT</span>
      </p>
    </div>
  )
}

function ReferralBadge({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={copy}
      className="rounded-full border-cyan/30 bg-cyan/10 text-cyan hover:bg-cyan/20 hover:text-cyan"
    >
      {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
      رمز الدعوة: {code}
    </Button>
  )
}

function ReferralLinkBadge({ link }: { link: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={copy}
      className="rounded-full border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
    >
      {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
      نسخ رابط الدعوة
    </Button>
  )
}

type MenuItem = { icon: React.ElementType; label: string; href?: string; badge?: string }

const menuGroups: { title: string; items: MenuItem[] }[] = [
  {
    title: 'الحساب',
    items: [
      { icon: Globe, label: 'الموقع الرسمي', href: '/' },
      { icon: Lock, label: 'كلمة المرور لتسجيل الدخول', href: '/dashboard/profile/change-password' },
      { icon: Shield, label: 'كلمة المرور الأمنية', href: '/dashboard/profile/change-security-password' },
      { icon: UserPlus, label: 'الاشتراك', href: '/dashboard/subscribe' },
    ],
  },
  {
    title: 'الدعم',
    items: [
      { icon: HelpCircle, label: 'مركز المساعدة', href: '/support' },
      { icon: Headphones, label: 'اتصل بخدمة العملاء', href: '/support' },
      { icon: Languages, label: 'تبديل اللغة', href: '#' },
      { icon: Bell, label: 'إشعارات', href: '#' },
    ],
  },
]

function MenuRow({ item }: { item: MenuItem }) {
  return (
    <Button
      variant="ghost"
      asChild
      className="w-full justify-between rounded-none px-4 h-auto py-3.5"
    >
      <Link href={item.href ?? '#'}>
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
            <item.icon size={17} />
          </span>
          <span className="text-sm font-medium">{item.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {item.badge && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/20 px-1 text-[10px] font-bold text-primary">
              {item.badge}
            </span>
          )}
          <ChevronLeft size={15} className="text-muted-foreground/50" />
        </div>
      </Link>
    </Button>
  )
}

export default function ProfilePage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState(defaultStats)
  const [isStatsLoading, setIsStatsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const referralCode = useMemo(() => {
    if (!user?.inviteCode) return '--------'
    return user.inviteCode
  }, [user?.inviteCode])

  const referralLink = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/auth/register?ref=${referralCode}`
  }, [referralCode])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (!user) return
    const userId = user.id

    let active = true

    async function loadStats() {
      setIsStatsLoading(true)

      const [{ data: earnings, error: earningsError }, { data: withdrawals, error: withdrawalsError }] = await Promise.all([
        supabase.from('earnings').select('amount_usdt').eq('user_id', userId),
        supabase.from('withdrawals').select('amount_usdt, status').eq('user_id', userId),
      ])

      if (!active) return

      if (earningsError || withdrawalsError) {
        setStats(defaultStats)
        setIsStatsLoading(false)
        return
      }

      const totalIncome = (earnings ?? []).reduce((sum, item) => sum + Number(item.amount_usdt ?? 0), 0)
      const pendingWithdraw = (withdrawals ?? [])
        .filter((item) => item.status === 'pending')
        .reduce((sum, item) => sum + Number(item.amount_usdt ?? 0), 0)

      setStats({ totalIncome, pendingWithdraw })
      setIsStatsLoading(false)
    }

    loadStats()

    return () => {
      active = false
    }
  }, [user])

  const handleLogout = async () => {
    if (isLoggingOut) return

    setIsLoggingOut(true)
    try {
      await logout()
      toast.success('تم تسجيل الخروج بنجاح')
      router.replace('/auth/login')
      router.refresh()
    } catch {
      toast.error('تعذر تسجيل الخروج، حاول مرة أخرى')
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (isLoading || (isAuthenticated && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (isLoggingOut) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="mx-auto max-w-md">

        {/* Header */}
        <div className="relative overflow-hidden px-5 pb-6 pt-10">
          <div className="pointer-events-none absolute -top-10 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex items-start justify-between">
            <div className="flex flex-col items-start gap-2">
              <ReferralBadge code={referralCode} />
              {referralLink ? <ReferralLinkBadge link={referralLink} /> : null}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">{user.email}</p>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-cyan/30 bg-cyan/10 px-2 py-0.5 text-[10px] font-bold text-cyan">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-pulse" />
                نشط
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <StatCard label="محفظة مرنة (USDT)" value={user.balance_usdt.toFixed(2)} icon={Wallet} accent />
            <StatCard label="المحفظة الإلكترونية (USDT)" value={user.balance_usdt.toFixed(2)} icon={TrendingUp} />
            <StatCard label="إجمالي الدخل (USDT)" value={isStatsLoading ? '0.00' : stats.totalIncome.toFixed(2)} icon={ArrowDownToLine} />
            <StatCard label="المبلغ المحجوز (USDT)" value={isStatsLoading ? '0.00' : stats.pendingWithdraw.toFixed(2)} icon={Send} />
          </div>
        </div>

        {/* Menu Groups */}
        <div className="space-y-4 px-4 pb-32">
          {menuGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-1 px-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
                {group.title}
              </p>
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                {group.items.map((item, i) => (
                  <div key={item.label}>
                    <MenuRow item={item} />
                    {i < group.items.length - 1 && <div className="mx-4 h-px bg-border/50" />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Logout */}
        <div className="px-5 pb-6 pt-2">
          <Button
            variant="destructive"
            size="lg"
            className="w-full rounded-2xl bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? <Spinner className="h-4 w-4" /> : <LogOut />}
            {isLoggingOut ? 'جارٍ تسجيل الخروج...' : 'تسجيل الخروج'}
          </Button>
        </div>

      </div>
    </div>
  )
}