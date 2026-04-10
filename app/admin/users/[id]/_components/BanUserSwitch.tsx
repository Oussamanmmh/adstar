"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { setUserBanStatus } from "@/lib/actions/admin"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

type BanUserSwitchProps = {
  userId: string
  isBanned: boolean
  isAdmin: boolean
}

export function BanUserSwitch({ userId, isBanned, isAdmin }: BanUserSwitchProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [currentValue, setCurrentValue] = useState(isBanned)

  const handleChange = (checked: boolean) => {
    const nextIsBanned = checked
    setCurrentValue(nextIsBanned)

    startTransition(async () => {
      const result = await setUserBanStatus({ userId, isBanned: nextIsBanned })

      if (!result.success) {
        setCurrentValue(!nextIsBanned)
        toast.error(result.error)
        return
      }

      toast.success(nextIsBanned ? "تم حظر المستخدم" : "تم إلغاء حظر المستخدم")
      router.refresh()
    })
  }

  if (isAdmin) {
    return <p className="text-xs text-muted-foreground">لا يمكن حظر حساب إداري</p>
  }

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="ban-user-switch" className="text-sm text-muted-foreground">
        {currentValue ? "المستخدم محظور" : "المستخدم نشط"}
      </Label>
      <Switch
        id="ban-user-switch"
        checked={currentValue}
        onCheckedChange={handleChange}
        disabled={isPending}
        aria-label="تبديل حالة حظر المستخدم"
      />
    </div>
  )
}
