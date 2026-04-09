"use client"

import { useEffect, useState } from "react"
import {
  getAdminSubscriptions,
  processAdminSubscription,
  type AdminSubscriptionRow,
} from "@/lib/actions/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { CheckCircle, XCircle, Clock, CreditCard, Loader2 } from "lucide-react"

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionRow[]>([])
  const [activeTab, setActiveTab] = useState("pending")
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    void loadSubscriptions()
  }, [])

  async function loadSubscriptions() {
    setIsLoading(true)
    const result = await getAdminSubscriptions()

    if (!result.success) {
      toast.error(result.error)
      setIsLoading(false)
      return
    }

    setSubscriptions(result.data)
    setIsLoading(false)
  }

  async function handleApprove(subId: string) {
    setProcessingId(subId)

    const result = await processAdminSubscription({
      subscriptionId: subId,
      decision: "approved",
    })

    if (!result.success) {
      toast.error(result.error)
      setProcessingId(null)
      return
    }

    toast.success("تمت الموافقة على الاشتراك")
    await loadSubscriptions()
    setProcessingId(null)
  }

  async function handleReject(subId: string) {
    setProcessingId(subId)

    const result = await processAdminSubscription({
      subscriptionId: subId,
      decision: "rejected",
    })

    if (!result.success) {
      toast.error(result.error)
      setProcessingId(null)
      return
    }

    toast.success("تم رفض الاشتراك")
    await loadSubscriptions()
    setProcessingId(null)
  }

  const pendingSubs = subscriptions.filter(s => s.status === "pending")
  const activeSubs = subscriptions.filter(s => s.status === "active")
  const allSubs = subscriptions

  function getStatusBadge(status: AdminSubscriptionRow["status"]) {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-yellow-500 border-yellow-500"><Clock className="h-3 w-3 mr-1" />معلّق</Badge>
      case "active":
        return <Badge variant="outline" className="text-green-500 border-green-500"><CheckCircle className="h-3 w-3 mr-1" />نشط</Badge>
      case "expired":
        return <Badge variant="outline" className="text-muted-foreground"><Clock className="h-3 w-3 mr-1" />منتهي</Badge>
    }
  }

  function SubscriptionTable({ data, showActions = false }: { data: AdminSubscriptionRow[]; showActions?: boolean }) {
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
                <TableCell colSpan={showActions ? 6 : 5} className="text-center text-muted-foreground py-8">
                  لا توجد اشتراكات
                </TableCell>
              </TableRow>
            ) : (
              data.map((sub) => {
                const profile = Array.isArray(sub.profile) ? sub.profile[0] : sub.profile
                const pkg = Array.isArray(sub.package) ? sub.package[0] : sub.package
                const isProcessing = processingId === sub.id
                
                return (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{profile?.full_name || "غير معروف"}</div>
                        <div className="text-sm text-muted-foreground">{profile?.email || ""}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-primary" />
                        <span>{pkg?.name || "غير معروف"}</span>
                        <span className="text-muted-foreground">${Number(pkg?.price_usdt ?? 0).toFixed(2)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded max-w-37.5 truncate block">
                        {sub.tx_hash ?? "-"}
                      </code>
                    </TableCell>
                    <TableCell>{getStatusBadge(sub.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(sub.created_at).toLocaleDateString("ar-EG")}
                    </TableCell>
                    {showActions && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleApprove(sub.id)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                موافقة
                              </>
                            )}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleReject(sub.id)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 mr-1" />
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
            )}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">الاشتراكات</h1>
        <p className="text-muted-foreground">إدارة دفعات الاشتراك</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="relative">
            معلّق
            {pendingSubs.length > 0 && (
              <span className="ml-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                {pendingSubs.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="active">نشط ({activeSubs.length})</TabsTrigger>
          <TabsTrigger value="all">الكل ({allSubs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>طلبات بانتظار الموافقة</CardTitle>
              <CardDescription>
                مراجعة والموافقة على دفعات الاشتراك
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <SubscriptionTable data={pendingSubs} showActions />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>الاشتراكات النشطة</CardTitle>
              <CardDescription>
                الاشتراكات النشطة حالياً
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <SubscriptionTable data={activeSubs} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>جميع الاشتراكات</CardTitle>
              <CardDescription>
                السجل الكامل للاشتراكات
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <SubscriptionTable data={allSubs} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
