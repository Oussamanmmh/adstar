"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { getWithdrawalsByUser, createWithdrawal, updateUser } from "@/lib/store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ArrowLeft, Wallet, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import type { Withdrawal } from "@/lib/types"

const MIN_WITHDRAWAL = 5

export default function WithdrawPage() {
  const { user, refreshUser } = useAuth()
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [amount, setAmount] = useState("")
  const [walletAddress, setWalletAddress] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (user) {
      setWithdrawals(getWithdrawalsByUser(user.id).sort((a, b) => 
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      ))
      if (user.walletAddress) {
        setWalletAddress(user.walletAddress)
      }
    }
  }, [user])

  if (!user) return null

  const hasPendingWithdrawal = withdrawals.some(w => w.status === "pending")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const withdrawAmount = parseFloat(amount)

    if (isNaN(withdrawAmount) || withdrawAmount < MIN_WITHDRAWAL) {
      toast.error(`الحد الأدنى للسحب هو $${MIN_WITHDRAWAL} USDT`)
      return
    }

    if (withdrawAmount > user.balance_usdt) {
      toast.error("الرصيد غير كافٍ")
      return
    }

    if (!walletAddress.trim()) {
      toast.error("يرجى إدخال عنوان المحفظة")
      return
    }

    setIsSubmitting(true)

    // Create withdrawal request
    createWithdrawal({
      userId: user.id,
      amount_usdt: withdrawAmount,
      walletAddress: walletAddress.trim(),
      status: "pending",
    })

    // Deduct from balance
    updateUser(user.id, {
      balance_usdt: user.balance_usdt - withdrawAmount,
      walletAddress: walletAddress.trim(),
    })

    toast.success("تم إرسال طلب السحب", {
      description: "طلبك الآن بانتظار موافقة الإدارة.",
    })

    // Refresh
    refreshUser()
    setWithdrawals(getWithdrawalsByUser(user.id).sort((a, b) => 
      new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    ))
    setAmount("")
    setIsSubmitting(false)
  }

  function getStatusBadge(status: Withdrawal["status"]) {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-yellow-500 border-yellow-500"><Clock className="h-3 w-3 mr-1" />معلّق</Badge>
      case "approved":
        return <Badge variant="outline" className="text-green-500 border-green-500"><CheckCircle className="h-3 w-3 mr-1" />مقبول</Badge>
      case "rejected":
        return <Badge variant="outline" className="text-red-500 border-red-500"><XCircle className="h-3 w-3 mr-1" />مرفوض</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <Link 
        href="/dashboard" 
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        العودة إلى اللوحة
      </Link>

      <div>
        <h1 className="text-2xl md:text-3xl font-bold">سحب الأرباح</h1>
        <p className="text-muted-foreground">حوّل أرباحك إلى محفظتك TRC20</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Withdrawal Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              طلب سحب
            </CardTitle>
            <CardDescription>
              أدخل المبلغ وعنوان المحفظة لإرسال طلب السحب
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasPendingWithdrawal ? (
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="font-medium">طلب سحب معلّق</div>
                  <div className="text-sm text-muted-foreground">
                    لديك بالفعل طلب سحب معلّق. يرجى الانتظار حتى تتم معالجته.
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <div className="text-sm text-muted-foreground">الرصيد المتاح</div>
                  <div className="text-3xl font-bold text-primary">${user.balance_usdt.toFixed(2)}</div>
                </div>

                <Field>
                  <FieldLabel htmlFor="amount">المبلغ (USDT)</FieldLabel>
                  <Input
                    id="amount"
                    type="number"
                    placeholder={`الحد الأدنى $${MIN_WITHDRAWAL}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min={MIN_WITHDRAWAL}
                    max={user.balance_usdt}
                    step="0.01"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="wallet">عنوان محفظة TRC20</FieldLabel>
                  <Input
                    id="wallet"
                    placeholder="أدخل عنوان محفظة TRC20"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                  />
                </Field>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={user.balance_usdt < MIN_WITHDRAWAL || isSubmitting}
                >
                  {isSubmitting ? "جارٍ المعالجة..." : "إرسال طلب السحب"}
                </Button>

                {user.balance_usdt < MIN_WITHDRAWAL && (
                  <p className="text-sm text-muted-foreground text-center">
                    تحتاج إلى رصيد لا يقل عن ${MIN_WITHDRAWAL} للسحب
                  </p>
                )}
              </form>
            )}
          </CardContent>
        </Card>

        {/* Withdrawal History */}
        <Card>
          <CardHeader>
            <CardTitle>سجل السحوبات</CardTitle>
            <CardDescription>
              جميع طلبات السحب السابقة
            </CardDescription>
          </CardHeader>
          <CardContent>
            {withdrawals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد طلبات سحب بعد
              </div>
            ) : (
              <div className="space-y-3">
                {withdrawals.map((withdrawal) => (
                  <div 
                    key={withdrawal.id}
                    className="p-3 rounded-lg bg-muted/50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold">${withdrawal.amount_usdt.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(withdrawal.requestedAt).toLocaleDateString()}
                      </div>
                    </div>
                    {getStatusBadge(withdrawal.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
