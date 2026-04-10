"use client"

import { memo, useCallback, useOptimistic, useReducer, useTransition, startTransition, useMemo } from "react"
import Image from "next/image"
import { processWithdrawalRequest } from "@/lib/actions/withdrawals"
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
import { AdminTablePagination } from "./AdminTablePagination"


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
    | { full_name: string | null; email: string | null }
    | { full_name: string | null; email: string | null }[]
    | null
}

interface Props {
  initialWithdrawals: AdminWithdrawal[]
  fetchError?: string
  page: number
  count: number
  totalCount: number
  totalPages: number
}

// ─── Optimistic reducer ───────────────────────────────────────────────────────

type OptimisticAction = {
  type: "SET_STATUS"
  id: string
  status: WithdrawalStatus
}

function optimisticReducer(
  withdrawals: AdminWithdrawal[],
  action: OptimisticAction,
): AdminWithdrawal[] {
  return withdrawals.map((w) =>
    w.id === action.id
      ? { ...w, status: action.status, processed_at: new Date().toISOString() }
      : w,
  )
}

// ─── Pure helpers (defined once outside component — never recreated) ──────────

function getProfile(withdrawal: AdminWithdrawal) {
  return Array.isArray(withdrawal.profile) ? withdrawal.profile[0] : withdrawal.profile
}

function getNetworkMeta(network: WithdrawalNetwork) {
  return network === "trc20"
    ? { label: "TRC20", image: "/assets/USDT-TRC20.png" }
    : { label: "BEP20", image: "/assets/USDT-BEP20.png" }
}

// ─── Sub-components (outside parent — stable identity, no closure captures) ──

function StatusBadge({ status }: { status: WithdrawalStatus }) {
  if (status === "pending")
    return (
      <Badge variant="outline" className="border-yellow-500 text-yellow-500">
        <Clock className="mr-1 h-3 w-3" />
        معلق
      </Badge>
    )
  if (status === "approved")
    return (
      <Badge variant="outline" className="border-green-500 text-green-500">
        <CheckCircle className="mr-1 h-3 w-3" />
        مقبول
      </Badge>
    )
  return (
    <Badge variant="outline" className="border-red-500 text-red-500">
      <XCircle className="mr-1 h-3 w-3" />
      مرفوض
    </Badge>
  )
}

// ─── Stat cards — isolated so they never re-render during row actions ─────────

interface StatsProps {
  pendingCount: number
  totalPending: number
}

const WithdrawalStats = memo(function WithdrawalStats({ pendingCount, totalPending }: StatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">الطلبات المعلقة</p>
          <p className="text-3xl font-bold text-yellow-500">{pendingCount}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">قيمة الطلبات المعلقة</p>
          <p className="text-3xl font-bold text-primary">${totalPending.toFixed(2)}</p>
        </CardContent>
      </Card>
    </div>
  )
})

// ─── Memoised row ─────────────────────────────────────────────────────────────

interface RowProps {
  withdrawal: AdminWithdrawal
  isProcessing: boolean
  onDecision: (id: string, decision: "approved" | "rejected") => void
  onCopy: (address: string) => void
}

const WithdrawalRow = memo(function WithdrawalRow({
  withdrawal,
  isProcessing,
  onDecision,
  onCopy,
}: RowProps) {
  const profile = getProfile(withdrawal)
  const net = getNetworkMeta(withdrawal.network)

  return (
    <TableRow>
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
            onClick={() => onCopy(withdrawal.wallet_address)}
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

      <TableCell>
        <StatusBadge status={withdrawal.status} />
      </TableCell>

      <TableCell className="text-right">
        {withdrawal.status === "pending" ? (
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => onDecision(withdrawal.id, "approved")}
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
              onClick={() => onDecision(withdrawal.id, "rejected")}
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

// ─── Main client component ────────────────────────────────────────────────────

export function AdminWithdrawalsClient({
  initialWithdrawals,
  fetchError,
  page,
  count,
  totalCount,
  totalPages,
}: Props) {
  const [optimisticWithdrawals, dispatchOptimistic] = useOptimistic(
    initialWithdrawals,
    optimisticReducer,
  )

  // ✅ Track which row is in-flight (not a boolean — supports concurrent clicks)
  const [processingId, setProcessingId] = useReducer(
    (_: string | null, next: string | null) => next,
    null,
  )
  const [, startDecisionTransition] = useTransition()

  if (fetchError) toast.error(fetchError)

  // ✅ useMemo — recomputes only when optimisticWithdrawals changes, not on every render
  const { pendingCount, totalPending } = useMemo(() => {
    let count = 0
    let total = 0
    for (const w of optimisticWithdrawals) {
      if (w.status === "pending") {
        count++
        total += Number(w.amount_usdt)
      }
    }
    return { pendingCount: count, totalPending: total }
  }, [optimisticWithdrawals])

  const handleDecision = useCallback(
    (withdrawalId: string, decision: "approved" | "rejected") => {
      setProcessingId(withdrawalId)

      startDecisionTransition(async () => {
        // Optimistically flip status so the row updates instantly
        startTransition(() =>
          dispatchOptimistic({ type: "SET_STATUS", id: withdrawalId, status: decision }),
        )

        const result = await processWithdrawalRequest({ withdrawalId, decision })

        if (!result.success) {
          // Revert to pending on failure
          startTransition(() =>
            dispatchOptimistic({ type: "SET_STATUS", id: withdrawalId, status: "pending" }),
          )
          toast.error(result.error)
          setProcessingId(null)
          return
        }

        toast.success(decision === "approved" ? "تمت الموافقة على الطلب" : "تم رفض الطلب")
        setProcessingId(null)
      })
    },
    [],
  )

  const handleCopy = useCallback((address: string) => {
    void navigator.clipboard.writeText(address)
    toast.success("تم نسخ العنوان")
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">إدارة السحوبات</h1>
        <p className="text-muted-foreground">
          مراجعة جميع طلبات السحب والموافقة أو الرفض يدويا
        </p>
      </div>

      {/* ✅ Stats card isolated in memo — approving a row won't re-render it
          until the optimistic list actually changes (which also triggers
          the pendingCount/totalPending recompute) */}
      <WithdrawalStats pendingCount={pendingCount} totalPending={totalPending} />

      <Card>
        <CardHeader>
          <CardTitle>جميع طلبات السحب</CardTitle>
          <CardDescription>
            تنفيذ التحويل يتم يدويا خارج المنصة من محفظة العميل
          </CardDescription>
        </CardHeader>

        <CardContent>
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
                {optimisticWithdrawals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      لا توجد طلبات سحب حاليا
                    </TableCell>
                  </TableRow>
                ) : (
                  optimisticWithdrawals.map((withdrawal) => (
                    <WithdrawalRow
                      key={withdrawal.id}
                      withdrawal={withdrawal}
                      isProcessing={processingId === withdrawal.id}
                      onDecision={handleDecision}
                      onCopy={handleCopy}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <AdminTablePagination
            page={page}
            count={count}
            totalCount={totalCount}
            totalPages={totalPages}
          />
        </CardContent>
      </Card>
    </div>
  )
}