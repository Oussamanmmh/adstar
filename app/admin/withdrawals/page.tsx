"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { getAdminWithdrawals, processWithdrawalRequest } from "@/lib/actions/withdrawals"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { CheckCircle, Clock, Copy, Loader2, XCircle } from "lucide-react"

type WithdrawalNetwork = "trc20" | "bep20"
type WithdrawalStatus = "pending" | "approved" | "rejected"

type AdminWithdrawal = {
  id: string
  user_id: string
  amount_usdt: number
  wallet_address: string
  network: WithdrawalNetwork
  status: WithdrawalStatus
  requested_at: string
  processed_at: string | null
  profile:
    | {
        full_name: string | null
        email: string | null
      }
    | {
        full_name: string | null
        email: string | null
      }[]
    | null
}

function statusBadge(status: WithdrawalStatus) {
  if (status === "pending") {
    return (
      <Badge variant="outline" className="border-yellow-500 text-yellow-500">
        <Clock className="mr-1 h-3 w-3" />
        معلق
      </Badge>
    )
  }

  if (status === "approved") {
    return (
      <Badge variant="outline" className="border-green-500 text-green-500">
        <CheckCircle className="mr-1 h-3 w-3" />
        مقبول
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="border-red-500 text-red-500">
      <XCircle className="mr-1 h-3 w-3" />
      مرفوض
    </Badge>
  )
}

function getNetworkMeta(network: WithdrawalNetwork) {
  if (network === "trc20") {
    return {
      label: "TRC20",
      image: "/assets/USDT-TRC20.png",
    }
  }

  return {
    label: "BEP20",
    image: "/assets/USDT-BEP20.png",
  }
}

export default function AdminWithdrawalsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([])

  const loadWithdrawals = useCallback(async () => {
    setIsLoading(true)

    const result = await getAdminWithdrawals()

    if (!result.success) {
      toast.error(result.error)
      setIsLoading(false)
      return
    }

    setWithdrawals(result.data)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    void loadWithdrawals()
  }, [loadWithdrawals])

  async function handleDecision(withdrawalId: string, decision: "approved" | "rejected") {
    setProcessingId(withdrawalId)

    const result = await processWithdrawalRequest({
      withdrawalId,
      decision,
    })

    if (!result.success) {
      toast.error(result.error)
      setProcessingId(null)
      return
    }

    toast.success(decision === "approved" ? "تمت الموافقة على الطلب" : "تم رفض الطلب")
    await loadWithdrawals()
    setProcessingId(null)
  }

  const pendingCount = useMemo(
    () => withdrawals.filter((withdrawal) => withdrawal.status === "pending").length,
    [withdrawals]
  )

  const totalPending = useMemo(
    () =>
      withdrawals
        .filter((withdrawal) => withdrawal.status === "pending")
        .reduce((sum, withdrawal) => sum + Number(withdrawal.amount_usdt), 0),
    [withdrawals]
  )

  function copyAddress(address: string) {
    navigator.clipboard.writeText(address)
    toast.success("تم نسخ العنوان")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">إدارة السحوبات</h1>
        <p className="text-muted-foreground">مراجعة جميع طلبات السحب والموافقة أو الرفض يدويا</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">الطلبات المعلقة</p>
            {isLoading ? (
              <Skeleton className="mt-2 h-8 w-20" />
            ) : (
              <p className="text-3xl font-bold text-yellow-500">{pendingCount}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">قيمة الطلبات المعلقة</p>
            {isLoading ? (
              <Skeleton className="mt-2 h-8 w-36" />
            ) : (
              <p className="text-3xl font-bold text-primary">${totalPending.toFixed(2)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>جميع طلبات السحب</CardTitle>
          <CardDescription>تنفيذ التحويل يتم يدويا خارج المنصة من محفظة العميل</CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المستخدم</TableHead>
                    <TableHead>الشبكة</TableHead>
                    <TableHead>العنوان</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>تاريخ الطلب</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {withdrawals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        لا توجد طلبات سحب حاليا
                      </TableCell>
                    </TableRow>
                  ) : (
                    withdrawals.map((withdrawal) => {
                      const profile = Array.isArray(withdrawal.profile)
                        ? withdrawal.profile[0]
                        : withdrawal.profile
                      const net = getNetworkMeta(withdrawal.network)
                      const isProcessing = processingId === withdrawal.id

                      return (
                        <TableRow key={withdrawal.id}>
                          <TableCell>
                            <div>
                              <p className="font-semibold">{profile?.full_name ?? "غير معروف"}</p>
                              <p className="text-xs text-muted-foreground">{profile?.email ?? "-"}</p>
                            </div>
                          </TableCell>

                          <TableCell>
                            <span className="inline-flex items-center gap-2">
                              <Image src={net.image} alt={net.label} width={18} height={18} />
                              {net.label}
                            </span>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="max-w-55 truncate rounded bg-muted px-2 py-1 text-xs">
                                {withdrawal.wallet_address}
                              </code>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => copyAddress(withdrawal.wallet_address)}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>

                          <TableCell className="font-semibold text-primary">
                            ${Number(withdrawal.amount_usdt).toFixed(2)}
                          </TableCell>

                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(withdrawal.requested_at).toLocaleString("ar-EG")}
                          </TableCell>

                          <TableCell>{statusBadge(withdrawal.status)}</TableCell>

                          <TableCell className="text-right">
                            {withdrawal.status === "pending" ? (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleDecision(withdrawal.id, "approved")}
                                  disabled={isProcessing}
                                >
                                  {isProcessing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <CheckCircle className="mr-1 h-4 w-4" />
                                      موافقة
                                    </>
                                  )}
                                </Button>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDecision(withdrawal.id, "rejected")}
                                  disabled={isProcessing}
                                >
                                  {isProcessing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <XCircle className="mr-1 h-4 w-4" />
                                      رفض
                                    </>
                                  )}
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">تمت المعالجة</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
