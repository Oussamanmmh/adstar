'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type InstallAppButtonProps = {
  className?: string
}

export function InstallAppButton({ className }: InstallAppButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor
    const android = /android/i.test(userAgent)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true

    setIsAndroid(android)
    setIsInstalled(standalone)

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setIsInstalled(true)
      toast.success('تم تثبيت التطبيق بنجاح')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const canShowInstallAction = useMemo(() => isAndroid && !isInstalled, [isAndroid, isInstalled])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (!window.isSecureContext) {
        toast.error('التثبيت يتطلب HTTPS أو فتح الموقع عبر localhost')
        return
      }

      toast.message('إذا لم تظهر نافذة التثبيت تلقائياً، افتح قائمة المتصفح ثم اختر تثبيت التطبيق')
      return
    }

    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice

    if (choice.outcome === 'accepted') {
      toast.success('رائع! جاري إضافة التطبيق إلى الشاشة الرئيسية')
    } else {
      toast.message('يمكنك تثبيت التطبيق لاحقاً من نفس الزر')
    }

    setDeferredPrompt(null)
  }

  if (!canShowInstallAction) {
    return null
  }

  return (
    <Button type='button' size='sm' onClick={handleInstallClick} className={cn('gap-1.5', className)}>
      <Download className='h-4 w-4' />
      تثبيت التطبيق
    </Button>
  )
}
