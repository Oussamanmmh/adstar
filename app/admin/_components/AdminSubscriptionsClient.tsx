// app/admin/subscriptions/_components/AdminSubscriptionsClient.tsx
"use client"

import {
  memo,
  useCallback,
  useOptimistic,
  useReducer,
  useTransition,
  startTransition,
  useMemo,
} from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { processAdminSubscription, type AdminSubscriptionRow } from "@/lib/actions/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { CheckCircle, Clock, CreditCard, Loader2, XCircle } from "lucide-react"
import { AdminTablePagination } from "./AdminTablePagination"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  initialSubscriptions: AdminSubscriptionRow[]
  fetchError?: string
  tab: "pending" | "active" | "all"
  page: number
  count: number
  totalCount: number
  totalPages: number
  pendingCount: number
  activeCount: number
  allCount: number
}

type Decision = "approved" | "rejected"

// ─── Optimistic reducer ───────────────────────────────────────────────────────

type OptimisticAction = { type: "SET_STATUS"; id: string; status: AdminSubscriptionRow["status"] }

function optimisticReducer(
  subs: AdminSubscriptionRow[],
  action: OptimisticAction,
): AdminSubscriptionRow[] {
  return subs.map((s) => (s.id === action.id ? { ...s, status: action.status } : s))
}

// ─── Pure helpers — defined outside component, never recreated ────────────────

function getProfile(sub: AdminSubscriptionRow) {
  return Array.isArray(sub.profile) ? sub.profile[0] : sub.profile
}

function getPackage(sub: AdminSubscriptionRow) {
  return Array.isArray(sub.package) ? sub.package[0] : sub.package
}

// ─── Status badge — plain function, no hooks, no closure → stable ─────────────

function StatusBadge({ status }: { status: AdminSubscriptionRow["status"] }) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="border-yellow-500 text-yellow-500">
          <Clock className="mr-1 h-3 w-3" />
          معلّق
        </Badge>
      )
    case "active":
      return (
        <Badge variant="outline" className="border-green-500 text-green-500">
          <CheckCircle className="mr-1 h-3 w-3" />
          نشط
        </Badge>
      )
    case "expired":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <Clock className="mr-1 h-3 w-3" />
          منتهي
        </Badge>
      )
  }
}

// ─── Memoised row — only re-renders when its own data or processingId changes ──

interface RowProps {
  sub: AdminSubscriptionRow
  showActions: boolean
  isProcessing: boolean
  onDecision: (id: string, decision: Decision) => void
}

const SubscriptionRow = memo(function SubscriptionRow({
  sub,
  showActions,
  isProcessing,
  onDecision,
}: RowProps) {
  const profile = getProfile(sub)
  const pkg = getPackage(sub)

  return (
    <TableRow>
      <TableCell>
        <div>
          <div className="font-medium">{profile?.full_name ?? "غير معروف"}</div>
          <div className="text-sm text-muted-foreground">{profile?.email ?? ""}</div>
        </div>
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          <span>{pkg?.name ?? "غير معروف"}</span>
          <span className="text-muted-foreground">
            ${Number(pkg?.price_usdt ?? 0).toFixed(2)}
          </span>
        </div>
      </TableCell>

      <TableCell>
        <code className="block max-w-[150px] truncate rounded bg-muted px-2 py-1 text-xs">
          {sub.tx_hash ?? "-"}
        </code>
      </TableCell>

      <TableCell>
        <StatusBadge status={sub.status} />
      </TableCell>

      <TableCell className="text-muted-foreground">
        {new Date(sub.created_at).toLocaleDateString("ar-EG")}
      </TableCell>

      {showActions && (
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              onClick={() => onDecision(sub.id, "approved")}
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
              size="sm"
              variant="outline"
              onClick={() => onDecision(sub.id, "rejected")}
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
        </TableCell>
      )}
    </TableRow>
  )
})

// ─── Memoised table — SubscriptionTable was defined *inside* the parent before,
//     which caused React to unmount + remount it on every render ───────────────

interface TableProps {
  data: AdminSubscriptionRow[]
  showActions?: boolean
  processingId: string | null
  onDecision: (id: string, decision: Decision) => void
}

const SubscriptionTable = memo(function SubscriptionTable({
  data,
  showActions = false,
  processingId,
  onDecision,
}: TableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>المستخدم</TableHead>
            <TableHead>الباقة</TableHead>
            <TableHead>TxHash</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>التاريخ</TableHead>
            {showActions && <TableHead className="text-right">الإجراءات</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={showActions ? 6 : 5}
                className="py-8 text-center text-muted-foreground"
              >
                لا توجد اشتراكات
              </TableCell>
            </TableRow>
          ) : (
            data.map((sub) => (
              <SubscriptionRow
                key={sub.id}
                sub={sub}
                showActions={showActions}
                isProcessing={processingId === sub.id}
                onDecision={onDecision}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
})

// ─── Main client component ────────────────────────────────────────────────────

export function AdminSubscriptionsClient({
  initialSubscriptions,
  fetchError,
  tab,
  page,
  count,
  totalCount,
  totalPages,
  pendingCount,
  activeCount,
  allCount,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [optimisticSubs, dispatchOptimistic] = useOptimistic(
    initialSubscriptions,
    optimisticReducer,
  )

  const [processingId, setProcessingId] = useReducer(
    (_: string | null, next: string | null) => next,
    null,
  )

  const [, startDecisionTransition] = useTransition()

  if (fetchError) toast.error(fetchError)

  const displayedSubs = useMemo(() => {
    if (tab === "all") return optimisticSubs
    return optimisticSubs.filter((s) => s.status === tab)
  }, [optimisticSubs, tab])

  const createTabQueryString = useCallback(
    (nextTab: "pending" | "active" | "all") => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("tab", nextTab)
      params.set("page", "1")
      params.set("count", String(count))
      return params.toString()
    },
    [count, searchParams],
  )

  const handleTabChange = useCallback(
    (nextTab: string) => {
      if (nextTab === "pending" || nextTab === "active" || nextTab === "all") {
        router.push(`${pathname}?${createTabQueryString(nextTab)}`)
      }
    },
    [createTabQueryString, pathname, router],
  )

  const currentMeta =
    tab === "pending"
      ? {
          title: "طلبات بانتظار الموافقة",
          description: "مراجعة والموافقة على دفعات الاشتراك",
          showActions: true,
        }
      : tab === "active"
        ? {
            title: "الاشتراكات النشطة",
            description: "الاشتراكات النشطة حالياً",
            showActions: false,
          }
        : {
            title: "جميع الاشتراكات",
            description: "السجل الكامل للاشتراكات",
            showActions: false,
          }

  // ✅ Single handler for both approve + reject — eliminates the duplicate
  //    handleApprove / handleReject functions from the original
  const handleDecision = useCallback((subId: string, decision: Decision) => {
    setProcessingId(subId)

    startDecisionTransition(async () => {
      // ✅ DB enum is "pending" | "active" | "expired" — no "rejected"
      const nextStatus = decision === "approved" ? "active" : "expired"

      // Optimistically move the row to its new status immediately
      startTransition(() =>
        dispatchOptimistic({ type: "SET_STATUS", id: subId, status: nextStatus }),
      )

      const result = await processAdminSubscription({ subscriptionId: subId, decision })

      if (!result.success) {
        // Revert to pending on failure
        startTransition(() =>
          dispatchOptimistic({ type: "SET_STATUS", id: subId, status: "pending" }),
        )
        toast.error(result.error)
        setProcessingId(null)
        return
      }

      toast.success(decision === "approved" ? "تمت الموافقة على الاشتراك" : "تم رفض الاشتراك")
      setProcessingId(null)
      router.refresh()
    })
  }, [router])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">الاشتراكات</h1>
        <p className="text-muted-foreground">إدارة دفعات الاشتراك</p>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="pending" className="relative">
            معلّق
            {pendingCount > 0 && (
              <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="active">نشط ({activeCount})</TabsTrigger>
          <TabsTrigger value="all">الكل ({allCount})</TabsTrigger>
        </TabsList>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>{currentMeta.title}</CardTitle>
            <CardDescription>{currentMeta.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <SubscriptionTable
              data={displayedSubs}
              showActions={currentMeta.showActions}
              processingId={processingId}
              onDecision={handleDecision}
            />

            <AdminTablePagination
              page={page}
              count={count}
              totalCount={totalCount}
              totalPages={totalPages}
            />
          </CardContent>
        </Card>
      </Tabs>
    </div>
  )
}