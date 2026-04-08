"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { 
  getActiveSubscription, 
  getPackageById, 
  getActiveVideos, 
  getTodayRatings, 
  getLastRatingTime,
  createRating,
  updateUser
} from "@/lib/store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { Star, Clock, CheckCircle, AlertCircle, ArrowLeft, DollarSign } from "lucide-react"
import Link from "next/link"
import type { Video, Package, VideoRating } from "@/lib/types"

function CountdownTimer({ targetTime, onComplete }: { targetTime: Date; onComplete?: () => void }) {
  const [timeLeft, setTimeLeft] = useState("")
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    function updateTimer() {
      const now = new Date()
      const diff = targetTime.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft("متاح الآن")
        setIsComplete(true)
        onComplete?.()
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [targetTime, onComplete])

  return (
    <span className={isComplete ? "text-primary" : "text-foreground"}>
      {timeLeft}
    </span>
  )
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="p-1 transition-transform hover:scale-110"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
        >
          <Star
            className={`h-8 w-8 transition-colors ${
              star <= (hover || value)
                ? "text-primary fill-primary"
                : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  )
}

export default function RatePage() {
  const { user, refreshUser } = useAuth()
  const router = useRouter()
  const [packageInfo, setPackageInfo] = useState<Package | null>(null)
  const [videos, setVideos] = useState<Video[]>([])
  const [todayRatings, setTodayRatings] = useState<VideoRating[]>([])
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [rating, setRating] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [canRate, setCanRate] = useState(false)
  const [nextRatingTime, setNextRatingTime] = useState<Date | null>(null)
  const [earnedToday, setEarnedToday] = useState(0)

  useEffect(() => {
    if (!user) return

    const activeSub = getActiveSubscription(user.id)
    if (!activeSub) {
      router.push("/dashboard/subscribe")
      return
    }

    const pkg = getPackageById(activeSub.packageId)
    setPackageInfo(pkg || null)

    const activeVideos = getActiveVideos()
    setVideos(activeVideos)

    const todayRatingsData = getTodayRatings(user.id)
    setTodayRatings(todayRatingsData)
    setEarnedToday(todayRatingsData.reduce((sum, r) => sum + r.earned_usdt, 0))

    // Check cooldown
    const lastRating = getLastRatingTime(user.id)
    if (lastRating) {
      const nextAllowed = new Date(lastRating.getTime() + 24 * 60 * 60 * 1000)
      const now = new Date()
      setCanRate(now >= nextAllowed)
      setNextRatingTime(nextAllowed)
    } else {
      setCanRate(true)
      setNextRatingTime(null)
    }
  }, [user, router])

  if (!user || !packageInfo) return null

  const maxVideosToday = packageInfo.videos_per_day
  const videosRatedToday = todayRatings.length
  const currentVideo = videos[currentVideoIndex]
  const allVideosDone = videosRatedToday >= maxVideosToday || currentVideoIndex >= videos.length

  const earningsPerVideo = packageInfo.daily_earnings / packageInfo.videos_per_day

  async function handleSubmitRating() {
    if (!currentVideo || rating === 0) return

    setIsSubmitting(true)

    // Create rating
    createRating({
      userId: user.id,
      videoId: currentVideo.id,
      rating,
      earned_usdt: earningsPerVideo,
    })

    // Update user balance
    updateUser(user.id, {
      balance_usdt: user.balance_usdt + earningsPerVideo,
      lastRatedAt: new Date().toISOString(),
    })

    toast.success(`Earned $${earningsPerVideo.toFixed(2)} USDT!`, {
      description: "تم تحديث رصيدك بنجاح.",
    })

    // Refresh data
    refreshUser()
    setTodayRatings(getTodayRatings(user.id))
    setEarnedToday((prev) => prev + earningsPerVideo)

    // Move to next video or show completion
    setRating(0)
    setCurrentVideoIndex((prev) => prev + 1)

    // Update cooldown
    setCanRate(false)
    setNextRatingTime(new Date(Date.now() + 24 * 60 * 60 * 1000))

    setIsSubmitting(false)
  }

  // Cooldown active view
  if (!canRate && nextRatingTime) {
    return (
      <div className="space-y-6">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          العودة إلى اللوحة
        </Link>

        <Card className="max-w-md mx-auto text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>الفاصل الزمني نشط</CardTitle>
            <CardDescription>
              يمكنك التقييم مرة أخرى بعد:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-4">
              <CountdownTimer 
                targetTime={nextRatingTime} 
                onComplete={() => setCanRate(true)} 
              />
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              فاصل 24 ساعة يضمن توزيعاً عادلاً للأرباح.
            </p>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground mb-1">أرباح اليوم</div>
              <div className="text-2xl font-bold text-primary">${earnedToday.toFixed(2)} USDT</div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // All videos rated view
  if (allVideosDone) {
    return (
      <div className="space-y-6">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          العودة إلى اللوحة
        </Link>

        <Card className="max-w-md mx-auto text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>أنهيت تقييمات اليوم!</CardTitle>
            <CardDescription>
              لقد قيّمت جميع الفيديوهات المتاحة اليوم.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-muted/50 mb-6">
              <div className="text-sm text-muted-foreground mb-1">أرباح اليوم</div>
              <div className="text-2xl font-bold text-primary">${earnedToday.toFixed(2)} USDT</div>
            </div>
            <p className="text-sm text-muted-foreground">
              عُد غداً لتقييم المزيد من الفيديوهات وربح المزيد!
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // No videos available
  if (!currentVideo) {
    return (
      <div className="space-y-6">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          العودة إلى اللوحة
        </Link>

        <Card className="max-w-md mx-auto text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>لا توجد فيديوهات متاحة</CardTitle>
            <CardDescription>
              لا توجد فيديوهات للتقييم حالياً. حاول لاحقاً.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Extract YouTube video ID
  const getYoutubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)
    return match ? match[1] : null
  }

  const youtubeId = getYoutubeId(currentVideo.youtubeUrl)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          العودة إلى اللوحة
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">الربح:</span>
          <span className="font-semibold">${earningsPerVideo.toFixed(2)}</span>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-muted-foreground">التقدم</span>
            <span>الفيديو {videosRatedToday + 1} من {maxVideosToday}</span>
          </div>
          <Progress value={(videosRatedToday / maxVideosToday) * 100} className="h-2" />
          <div className="flex items-center justify-between mt-2 text-sm">
            <span className="text-muted-foreground">أرباح اليوم:</span>
            <span className="font-semibold text-primary">${earnedToday.toFixed(2)} USDT</span>
          </div>
        </CardContent>
      </Card>

      {/* Video Player */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{currentVideo.title}</CardTitle>
          <CardDescription>شاهد الفيديو ثم قيّمه بالنجوم في الأسفل</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* YouTube Embed */}
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
            {youtubeId ? (
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}`}
                title={currentVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-muted-foreground">الفيديو غير متاح</p>
              </div>
            )}
          </div>

          {/* Rating */}
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-sm text-muted-foreground">كيف تقيّم هذا الفيديو؟</p>
            <StarRating value={rating} onChange={setRating} />
            <Button 
              onClick={handleSubmitRating} 
              disabled={rating === 0 || isSubmitting}
              className="min-w-[200px]"
            >
              {isSubmitting ? "جارٍ الإرسال..." : `إرسال التقييم واربح $${earningsPerVideo.toFixed(2)}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
