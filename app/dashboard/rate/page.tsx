"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getRatePageData, submitVideoRating } from "@/lib/actions/subscriptions-rating"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Star, Clock, CheckCircle, AlertCircle, ArrowLeft, Zap, TrendingUp } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type PackageInfo = {
  id: string
  name: string
  daily_earnings: number
  duration_days: number
  videos_per_day: number
}

type Video = {
  id: string
  title: string
  youtube_url: string
  thumbnail_url: string | null
  order_index: number
  is_active: boolean
}

type VideoRating = {
  id: string
  video_id: string
  rating: number
  earned_usdt: number
  rated_at: string
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-muted/60",
        className
      )}
    />
  )
}

function RatePageSkeleton() {
  return (
    <div className="space-y-5 max-w-2xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-5 w-20" />
      </div>

      {/* Progress card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex justify-between mt-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>

      {/* Video thumbnails */}
      <div className="flex gap-3 overflow-hidden">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="shrink-0 w-36 h-24 rounded-xl" />
        ))}
      </div>

      {/* Main video */}
      <Skeleton className="w-full aspect-video rounded-xl" />

      {/* Rating */}
      <div className="rounded-xl border border-border bg-card p-6">
        <Skeleton className="h-5 w-40 mx-auto mb-5" />
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="w-10 h-10 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  )
}

// ─── Countdown Timer ──────────────────────────────────────────────────────────

function CountdownTimer({
  targetTime,
  onComplete,
}: {
  targetTime: Date
  onComplete?: () => void
}) {
  const [parts, setParts] = useState({ h: "00", m: "00", s: "00", done: false })

  useEffect(() => {
    function tick() {
      const diff = targetTime.getTime() - Date.now()
      if (diff <= 0) {
        setParts({ h: "00", m: "00", s: "00", done: true })
        onComplete?.()
        return
      }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      setParts({
        h: String(h).padStart(2, "0"),
        m: String(m).padStart(2, "0"),
        s: String(s).padStart(2, "0"),
        done: false,
      })
    }
    tick()
    const id = setInterval(tick, 1_000)
    return () => clearInterval(id)
  }, [targetTime, onComplete])

  if (parts.done)
    return <span className="text-primary font-bold">متاح الآن!</span>

  return (
    <div className="flex items-center justify-center gap-1 font-mono text-foreground">
      {[parts.h, parts.m, parts.s].map((val, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-secondary text-2xl font-bold tabular-nums">
            {val}
          </span>
          {i < 2 && (
            <span className="text-2xl font-bold text-muted-foreground mb-1">:</span>
          )}
        </span>
      ))}
    </div>
  )
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
  disabled = false,
}: {
  value: number
  onChange: (v: number) => void
  disabled?: boolean
}) {
  const [hover, setHover] = useState(0)
  const active = disabled ? value : (hover || value)

  return (
    <div className="flex items-center justify-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= active
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(star)}
            className={cn(
              "relative p-1.5 rounded-xl transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              filled ? "scale-110" : "scale-100 opacity-50 hover:opacity-80",
              disabled && "cursor-not-allowed opacity-60"
            )}
            aria-label={`${star} نجوم`}
          >
            <Star
              className={cn(
                "h-9 w-9 transition-all duration-150",
                filled
                  ? "fill-primary text-primary drop-shadow-[0_0_6px_var(--color-primary,theme(colors.cyan.400))]"
                  : "text-muted-foreground"
              )}
            />
          </button>
        )
      })}
    </div>
  )
}

// ─── Progress Arc ─────────────────────────────────────────────────────────────

function ProgressSteps({
  total,
  done,
}: {
  total: number
  done: number
}) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-500",
            i < done
              ? "bg-primary flex-[2]"
              : i === done
                ? "bg-primary/40 flex-[2] animate-pulse"
                : "bg-muted flex-1"
          )}
        />
      ))}
    </div>
  )
}

// ─── Video Thumbnail Card ─────────────────────────────────────────────────────

function VideoThumb({
  video,
  isSelected,
  isRated,
  onClick,
}: {
  video: Video
  isSelected: boolean
  isRated: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative shrink-0 w-36 rounded-xl overflow-hidden border-2 transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isSelected
          ? "border-primary shadow-[0_0_0_3px_oklch(0.75_0.18_205_/_0.2)]"
          : "border-transparent hover:border-border"
      )}
    >
      <div className="aspect-video bg-muted">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            بدون صورة
          </div>
        )}
      </div>

      {/* Rated overlay */}
      {isRated && (
        <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
          <CheckCircle className="h-6 w-6 text-primary" />
        </div>
      )}

      {/* Selected ring label */}
      {isSelected && !isRated && (
        <div className="absolute bottom-0 inset-x-0 bg-primary/90 py-0.5">
          <p className="text-[10px] font-medium text-primary-foreground text-center">محدد</p>
        </div>
      )}
    </button>
  )
}

// ─── State Pages ──────────────────────────────────────────────────────────────

function CooldownPage({
  earnedToday,
  nextRatingTime,
  onAvailable,
}: {
  earnedToday: number
  nextRatingTime: Date
  onAvailable: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 max-w-sm mx-auto" dir="rtl">
      <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center">
        <Clock className="h-9 w-9 text-muted-foreground" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">الفاصل الزمني نشط</h2>
        <p className="text-sm text-muted-foreground">
          يمكنك التقييم مرة أخرى خلال:
        </p>
      </div>

      <CountdownTimer targetTime={nextRatingTime} onComplete={onAvailable} />

      <div className="w-full p-5 rounded-2xl bg-card border border-border">
        <p className="text-xs text-muted-foreground mb-1">أرباحك اليوم</p>
        <p className="text-3xl font-bold text-primary">${earnedToday.toFixed(2)}</p>
        <p className="text-xs text-muted-foreground mt-1">USDT</p>
      </div>

      <p className="text-xs text-muted-foreground">
        فاصل 24 ساعة يضمن توزيعاً عادلاً للأرباح بين المستخدمين.
      </p>
    </div>
  )
}

function CompletedPage({ earnedToday }: { earnedToday: number }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 max-w-sm mx-auto" dir="rtl">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle className="h-11 w-11 text-primary" />
        </div>
        <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-card border-2 border-primary flex items-center justify-center">
          <Zap className="h-3.5 w-3.5 text-primary" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">أحسنت! انتهيت اليوم 🎉</h2>
        <p className="text-sm text-muted-foreground">
          لقد قيّمت جميع الفيديوهات المتاحة لهذا اليوم.
        </p>
      </div>

      <div className="w-full p-5 rounded-2xl bg-card border border-border">
        <div className="flex items-center justify-center gap-2 mb-1">
          <TrendingUp className="h-4 w-4 text-primary" />
          <p className="text-xs text-muted-foreground">إجمالي أرباح اليوم</p>
        </div>
        <p className="text-4xl font-bold text-primary">${earnedToday.toFixed(2)}</p>
        <p className="text-xs text-muted-foreground mt-1">USDT أُضيف لرصيدك</p>
      </div>

      <Button variant="outline" asChild className="w-full">
        <Link href="/dashboard">العودة إلى الرئيسية</Link>
      </Button>

      <p className="text-xs text-muted-foreground">عُد غداً لتقييم المزيد وربح المزيد!</p>
    </div>
  )
}

function NoVideosPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 max-w-sm mx-auto" dir="rtl">
      <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center">
        <AlertCircle className="h-9 w-9 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">لا توجد فيديوهات متاحة</h2>
        <p className="text-sm text-muted-foreground">
          لا توجد فيديوهات للتقييم حالياً. تحقق مرة أخرى لاحقاً.
        </p>
      </div>
      <Button variant="outline" asChild>
        <Link href="/dashboard">
          <ArrowLeft className="h-4 w-4 ml-1" />
          العودة للرئيسية
        </Link>
      </Button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RatePage() {
  const { user, refreshUser } = useAuth()
  const router = useRouter()

  const [packageInfo, setPackageInfo] = useState<PackageInfo | null>(null)
  const [videos, setVideos] = useState<Video[]>([])
  const [todayRatings, setTodayRatings] = useState<VideoRating[]>([])
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [canRate, setCanRate] = useState(false)
  const [nextRatingTime, setNextRatingTime] = useState<Date | null>(null)
  const [earnedToday, setEarnedToday] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    void loadData()
  }, [user])

  async function loadData() {
    setIsLoading(true)
    const result = await getRatePageData()

    if (!result.success) {
      toast.error(result.error)
      setIsLoading(false)
      return
    }

    if (!result.data.activeSubscription || !result.data.packageInfo) {
      router.push("/dashboard/subscribe")
      return
    }

    const loadedVideos = result.data.videos

    setPackageInfo(result.data.packageInfo)
    setVideos(loadedVideos)
    setSelectedVideoId((current) => {
      if (current && loadedVideos.some((v) => v.id === current)) return current
      return loadedVideos[0]?.id ?? null
    })
    setTodayRatings(result.data.todayRatings)
    setEarnedToday(result.data.earnedToday)
    setCanRate(result.data.canRate)
    setNextRatingTime(
      result.data.nextRatingTime ? new Date(result.data.nextRatingTime) : null
    )
    setIsLoading(false)
  }

  if (!user) return null
  if (isLoading) return <RatePageSkeleton />

  if (!packageInfo) return null

  const maxVideosToday = packageInfo.videos_per_day
  const videosRatedToday = todayRatings.length
  const ratedIds = new Set(todayRatings.map((r) => r.video_id))
  const selectedVideo = videos.find((v) => v.id === selectedVideoId) ?? videos[0]
  const allVideosDone = videosRatedToday >= maxVideosToday
  const earningsPerVideo = packageInfo.daily_earnings / packageInfo.videos_per_day
  const isCooldown = !canRate && !!nextRatingTime

  // ─── State pages ─────────────────────────────────────────────────────────

  if (allVideosDone && canRate) {
    return <CompletedPage earnedToday={earnedToday} />
  }

  if (!selectedVideo) {
    return <NoVideosPage />
  }

  // ─── Submit ──────────────────────────────────────────────────────────────

  async function handleSubmitRating() {
    if (!selectedVideo || rating === 0 || !user || isCooldown) return
    setIsSubmitting(true)

    const result = await submitVideoRating({ videoId: selectedVideo.id, rating })

    if (!result.success) {
      toast.error(result.error)
      setIsSubmitting(false)
      return
    }

    toast.success(`ربحت $${result.earned.toFixed(2)} USDT!`, {
      description: "تم تحديث رصيدك بنجاح.",
    })

    setRating(0)
    await Promise.all([loadData(), refreshUser()])

    setIsSubmitting(false)
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const getYoutubeId = (url: string) => {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)
    return m ? m[1] : null
  }

  const youtubeId = getYoutubeId(selectedVideo.youtube_url)
  const isCurrentRated = ratedIds.has(selectedVideo.id)

  // ─── Main render ─────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-5" dir="rtl">
      {isCooldown && nextRatingTime && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4 px-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">
                <p className="font-semibold">لا يمكنك التقييم الآن</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  يمكنك مشاهدة الفيديوهات، والتقييم سيُفتح تلقائياً بعد انتهاء المؤقت.
                </p>
              </div>
              <Clock className="h-5 w-5 text-primary shrink-0" />
            </div>

            <CountdownTimer
              targetTime={nextRatingTime}
              onComplete={() => {
                setCanRate(true)
                setNextRatingTime(null)
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          الرئيسية
        </Link>
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">الربح لكل تقييم:</span>
          <span className="font-bold text-primary">${earningsPerVideo.toFixed(2)}</span>
        </div>
      </div>

      {/* ── Progress card ── */}
      <Card>
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between mb-3 text-sm">
            <span className="text-muted-foreground">التقدم اليومي</span>
            <span className="font-medium">
              {videosRatedToday} / {maxVideosToday} فيديو
            </span>
          </div>

          <ProgressSteps total={maxVideosToday} done={videosRatedToday} />

          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-muted-foreground">
              {maxVideosToday - videosRatedToday} متبقي
            </span>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-bold text-primary">
                ${earnedToday.toFixed(2)} USDT
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Video selector (horizontal scroll) ── */}
      {videos.length > 1 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground px-0.5">اختر فيديو للتقييم</p>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            {videos.map((video) => (
              <VideoThumb
                key={video.id}
                video={video}
                isSelected={selectedVideo.id === video.id}
                isRated={ratedIds.has(video.id)}
                onClick={() => {
                  setSelectedVideoId(video.id)
                  setRating(0)
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Video player ── */}
      <div className="rounded-xl overflow-hidden border border-border bg-card">
        <div className="relative aspect-video bg-muted">
          {youtubeId ? (
            <iframe
              key={youtubeId}
              src={`https://www.youtube.com/embed/${youtubeId}`}
              title={selectedVideo.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">الفيديو غير متاح</p>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-border">
          <p className="text-sm font-medium line-clamp-1">{selectedVideo.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            شاهد الفيديو ثم قيّمه بالنجوم أدناه
          </p>
        </div>
      </div>

      {/* ── Rating card ── */}
      <Card>
        <CardContent className="py-6 px-5 space-y-5">
          {isCurrentRated ? (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <CheckCircle className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium text-sm">تم تقييم هذا الفيديو</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  اختر فيديو آخر من القائمة أعلاه لتكمل تقييماتك
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">كيف تقيّم هذا الفيديو؟</p>
                <p className="text-xs text-muted-foreground">
                  اضغط على النجوم لتحديد تقييمك
                </p>
              </div>

              <StarRating value={rating} onChange={setRating} disabled={isCooldown} />

              {/* Rating label */}
              <div className="h-5 text-center">
                {rating > 0 && (
                  <p className="text-xs text-muted-foreground animate-in fade-in duration-200">
                    {["", "ضعيف", "مقبول", "جيد", "جيد جداً", "ممتاز"][rating]}
                  </p>
                )}
              </div>

              <Button
                onClick={handleSubmitRating}
                disabled={rating === 0 || isSubmitting || isCooldown}
                className="w-full h-12 text-base font-semibold"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    جارٍ الإرسال...
                  </span>
                ) : isCooldown ? (
                  <span className="flex items-center gap-2 text-white">
                    <Clock className="h-4 w-4" />
                    التقييم مقفل مؤقتاً
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    إرسال التقييم واربح ${earningsPerVideo.toFixed(2)}
                  </span>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}