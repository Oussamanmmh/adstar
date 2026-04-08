"use client"

import { useEffect, useState } from "react"
import { 
  getWithdrawals, 
  getUserById, 
  updateWithdrawal,
  updateUser
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
import { CheckCircle, XCircle, Clock, Wallet, Copy } from "lucide-react"
import type { Withdrawal } from "@/lib/types"

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [activeTab, setActiveTab] = useState("pending")

  useEffect(() => {
    loadWithdrawals()
  }, [])

  function loadWithdrawals() {
    const allWithdrawals = getWithdrawals().sort((a, b) => 
      new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    )
    setWithdrawals(allWithdrawals)
  }

  function handleApprove(withdrawalId: string) {
    updateWithdrawal(withdrawalId, {
      status: "approved",
      processedAt: new Date().toISOString(),
    })

    toast.success("تمت الموافقة على السحب")
    loadWithdrawals()
  }

  function handleReject(withdrawalId: string) {
    const withdrawal = withdrawals.find(w => w.id === withdrawalId)
    if (!withdrawal) return

    // Refund the user
    const user = getUserById(withdrawal.userId)
    if (user) {
      updateUser(user.id, {
        balance_usdt: user.balance_usdt + withdrawal.amount_usdt,
      })
    }

    updateWithdrawal(withdrawalId, {
      status: "rejected",
      processedAt: new Date().toISOString(),
    })

    toast.success("تم رفض السحب وإعادة الرصيد")
    loadWithdrawals()
  }

  function copyAddress(address: string) {
    navigator.clipboard.writeText(address)
    toast.success("تم نسخ العنوان")
  }

  const pendingWithdrawals = withdrawals.filter(w => w.status === "pending")
  const approvedWithdrawals = withdrawals.filter(w => w.status === "approved")
  const allWithdrawals = withdrawals

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

  function WithdrawalTable({ data, showActions = false }: { data: Withdrawal[]; showActions?: boolean }) {
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>المستخدم</TableHead>
              <TableHead>المبلغ</TableHead>
              <TableHead>المحفظة</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>التاريخ</TableHead>
              {showActions && <TableHead className="text-right">الإجراءات</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showActions ? 6 : 5} className="text-center text-muted-foreground py-8">
                  لا توجد سحوبات
                </TableCell>
              </TableRow>
            ) : (
              data.map((withdrawal) => {
                const user = getUserById(withdrawal.userId)
                
                return (
                  <TableRow key={withdrawal.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user?.fullName || "غير معروف"}</div>
                        <div className="text-sm text-muted-foreground">{user?.email || ""}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 font-semibold text-primary">
                        <Wallet className="h-4 w-4" />
                        ${withdrawal.amount_usdt.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded max-w-[120px] truncate">
                          {withdrawal.walletAddress}
                        </code>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6"
                          onClick={() => copyAddress(withdrawal.walletAddress)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(withdrawal.requestedAt).toLocaleDateString()}
                    </TableCell>
                    {showActions && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleApprove(withdrawal.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            موافقة
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleReject(withdrawal.id)}
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

  const totalPending = pendingWithdrawals.reduce((sum, w) => sum + w.amount_usdt, 0)
  const totalApproved = approvedWithdrawals.reduce((sum, w) => sum + w.amount_usdt, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">السحوبات</h1>
        <p className="text-muted-foreground">إدارة طلبات السحب</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">المبلغ المعلّق</div>
            <div className="text-2xl font-bold text-yellow-500">${totalPending.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">إجمالي المدفوع</div>
            <div className="text-2xl font-bold text-green-500">${totalApproved.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="relative">
            معلّق
            {pendingWithdrawals.length > 0 && (
              <span className="ml-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                {pendingWithdrawals.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">مقبول ({approvedWithdrawals.length})</TabsTrigger>
          <TabsTrigger value="all">الكل ({allWithdrawals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>السحوبات المعلّقة</CardTitle>
              <CardDescription>
                راجع وعالج طلبات السحب
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WithdrawalTable data={pendingWithdrawals} showActions />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>السحوبات المقبولة</CardTitle>
              <CardDescription>
                السحوبات التي تمت معالجتها بنجاح
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WithdrawalTable data={approvedWithdrawals} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>كل السحوبات</CardTitle>
              <CardDescription>
                السجل الكامل لجميع السحوبات
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WithdrawalTable data={allWithdrawals} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
