"use client"

import { useEffect, useState } from "react"
import { 
  getSubscriptions, 
  getPackageById, 
  getUserById, 
  updateSubscription 
} from "@/lib/store"
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
import { CheckCircle, XCircle, Clock, CreditCard } from "lucide-react"
import type { UserSubscription } from "@/lib/types"

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([])
  const [activeTab, setActiveTab] = useState("pending")

  useEffect(() => {
    loadSubscriptions()
  }, [])

  function loadSubscriptions() {
    const allSubs = getSubscriptions().sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    setSubscriptions(allSubs)
  }

  function handleApprove(subId: string) {
    const now = new Date()
    const sub = subscriptions.find(s => s.id === subId)
    if (!sub) return

    const pkg = getPackageById(sub.packageId)
    if (!pkg) return

    const expiresAt = new Date(now.getTime() + pkg.duration_days * 24 * 60 * 60 * 1000)

    updateSubscription(subId, {
      status: "active",
      startedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    })

    toast.success("تمت الموافقة على الاشتراك")
    loadSubscriptions()
  }

  function handleReject(subId: string) {
    updateSubscription(subId, {
      status: "rejected",
    })

    toast.success("تم رفض الاشتراك")
    loadSubscriptions()
  }

  const pendingSubs = subscriptions.filter(s => s.status === "pending")
  const activeSubs = subscriptions.filter(s => s.status === "active")
  const allSubs = subscriptions

  function getStatusBadge(status: UserSubscription["status"]) {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-yellow-500 border-yellow-500"><Clock className="h-3 w-3 mr-1" />معلّق</Badge>
      case "active":
        return <Badge variant="outline" className="text-green-500 border-green-500"><CheckCircle className="h-3 w-3 mr-1" />نشط</Badge>
      case "expired":
        return <Badge variant="outline" className="text-muted-foreground"><Clock className="h-3 w-3 mr-1" />منتهي</Badge>
      case "rejected":
        return <Badge variant="outline" className="text-red-500 border-red-500"><XCircle className="h-3 w-3 mr-1" />مرفوض</Badge>
    }
  }

  function SubscriptionTable({ data, showActions = false }: { data: UserSubscription[]; showActions?: boolean }) {
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
                const user = getUserById(sub.userId)
                const pkg = getPackageById(sub.packageId)
                
                return (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user?.fullName || "غير معروف"}</div>
                        <div className="text-sm text-muted-foreground">{user?.email || ""}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-primary" />
                        <span>{pkg?.name || "غير معروف"}</span>
                        <span className="text-muted-foreground">${pkg?.price_usdt}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded max-w-[150px] truncate block">
                        {sub.txHash}
                      </code>
                    </TableCell>
                    <TableCell>{getStatusBadge(sub.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </TableCell>
                    {showActions && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleApprove(sub.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            موافقة
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleReject(sub.id)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            رفض
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
              <SubscriptionTable data={pendingSubs} showActions />
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
              <SubscriptionTable data={activeSubs} />
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
              <SubscriptionTable data={allSubs} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
