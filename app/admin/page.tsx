"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getAdminDashboardData } from "@/lib/actions/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Users, 
  Package,
  CreditCard, 
  Wallet, 
  DollarSign, 
  TrendingUp,
  ArrowRight,
  Clock
} from "lucide-react"
import type { DashboardStats } from "@/lib/types"

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      const result = await getAdminDashboardData()

      if (!result.success) {
        setError(result.error)
        setIsLoading(false)
        return
      }

      setStats(result.data)
      setError(null)
      setIsLoading(false)
    }

    void loadData()
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="mt-2 h-4 w-60" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
                <Skeleton className="mt-2 h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>تعذر تحميل لوحة الإدارة</CardTitle>
          <CardDescription>{error ?? "حدث خطأ غير متوقع"}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const pendingSubsCount = stats.pendingSubscriptions
  const pendingWithdrawalsCount = stats.pendingWithdrawals

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">لوحة الإدارة</h1>
        <p className="text-muted-foreground">نظرة عامة على مؤشرات المنصة</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المستخدمين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">حسابات مسجلة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">الاشتراكات النشطة</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">نشطة حالياً</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المدفوعات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalPaidOut.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">سحوبات مقبولة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الأرباح</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">مجموع أرصدة المستخدمين</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className={pendingSubsCount > 0 ? "border-primary/50" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  الاشتراكات المعلّقة
                </CardTitle>
                <CardDescription>
                  دفعات الاشتراك بانتظار الموافقة
                </CardDescription>
              </div>
              {pendingSubsCount > 0 && (
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  {pendingSubsCount}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {pendingSubsCount > 0 ? (
              <Button asChild className="w-full">
                <Link href="/admin/subscriptions">
                  مراجعة الاشتراكات
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                لا توجد اشتراكات معلّقة
              </p>
            )}
          </CardContent>
        </Card>

        <Card className={pendingWithdrawalsCount > 0 ? "border-primary/50" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  السحوبات المعلّقة
                </CardTitle>
                <CardDescription>
                  طلبات السحب بانتظار الموافقة
                </CardDescription>
              </div>
              {pendingWithdrawalsCount > 0 && (
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  {pendingWithdrawalsCount}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {pendingWithdrawalsCount > 0 ? (
              <Button asChild className="w-full">
                <Link href="/admin/withdrawals">
                  مراجعة السحوبات
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                لا توجد سحوبات معلّقة
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>إجراءات سريعة</CardTitle>
          <CardDescription>أكثر المهام الإدارية استخداماً</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Button variant="outline" asChild>
              <Link href="/admin/users">
                <Users className="mr-2 h-4 w-4" />
                إدارة المستخدمين
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/packages">
                <Package className="mr-2 h-4 w-4" />
                إدارة الباقات
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/subscriptions">
                <CreditCard className="mr-2 h-4 w-4" />
                الاشتراكات
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/withdrawals">
                <Wallet className="mr-2 h-4 w-4" />
                السحوبات
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/videos">
                <Users className="mr-2 h-4 w-4" />
                الفيديوهات
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
