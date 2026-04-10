import Link from "next/link"
import { notFound } from "next/navigation"
import { getAdminUserDetails } from "@/lib/actions/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, DollarSign, TrendingUp, Wallet, PlayCircle, CreditCard } from "lucide-react"
import { BanUserSwitch } from "./_components/BanUserSwitch"

export default async function AdminUserDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getAdminUserDetails(id)

  if (!result.success) {
    if (result.error.includes("غير موجود")) {
      notFound()
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>تعذر تحميل بيانات المستخدم</CardTitle>
          <CardDescription>{result.error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/admin/users">العودة لإدارة المستخدمين</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { profile, totals, activity, subscriptions } = result.data

  const getStatusBadge = (status: "pending" | "active" | "expired") => {
    if (status === "active") {
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">نشط</Badge>
    }

    if (status === "pending") {
      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">معلق</Badge>
    }

    return <Badge variant="outline">منتهي</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">تفاصيل المستخدم</h1>
          <p className="text-muted-foreground">عرض الأداء المالي والنشاط للمستخدم</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/users">
            <ArrowLeft className="h-4 w-4 mr-1" />
            العودة للمستخدمين
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle>{profile.full_name || "بدون اسم"}</CardTitle>
              <CardDescription>{profile.email || "بدون بريد"}</CardDescription>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <BanUserSwitch userId={profile.id} isBanned={profile.is_banned} isAdmin={profile.is_admin} />
              {profile.is_admin && <Badge className="bg-primary/10 text-primary border-primary/20">مسؤول</Badge>}
              {profile.is_banned ? (
                <Badge className="bg-destructive/10 text-destructive border-destructive/20">محظور</Badge>
              ) : (
                <Badge variant="outline">نشط</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <p>
            <span className="text-muted-foreground">المحفظة:</span> {profile.wallet_address || "غير مضافة"}
          </p>
          <p>
            <span className="text-muted-foreground">تاريخ الانضمام:</span>{" "}
            {new Date(profile.created_at).toLocaleString("ar-EG")}
          </p>
          <p>
            <span className="text-muted-foreground">الرصيد الحالي:</span> ${profile.balance_usdt.toFixed(2)}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإيراد</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totals.totalRevenue.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">من جدول earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإيداعات</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totals.totalDeposits.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">إيداعات مؤكدة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">أرباح التقييم</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totals.totalRatingEarnings.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">من تقييم الفيديوهات</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المسحوب</CardTitle>
            <CreditCard className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totals.totalWithdrawnApproved.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">طلبات سحب مقبولة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">طلبات سحب معلقة</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totals.pendingWithdrawalAmount.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">بانتظار المعالجة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">نشاط التقييم</CardTitle>
            <PlayCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totals.ratingsCount}</p>
            <p className="text-xs text-muted-foreground">عدد التقييمات</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>آخر النشاطات</CardTitle>
          <CardDescription>ملخص آخر عمليات المستخدم</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">آخر تقييم:</span>{" "}
            {activity.lastRatingAt ? new Date(activity.lastRatingAt).toLocaleString("ar-EG") : "لا يوجد"}
          </p>
          <p>
            <span className="text-muted-foreground">آخر إيداع:</span>{" "}
            {activity.lastDepositAt ? new Date(activity.lastDepositAt).toLocaleString("ar-EG") : "لا يوجد"}
          </p>
          <p>
            <span className="text-muted-foreground">آخر طلب سحب:</span>{" "}
            {activity.lastWithdrawalAt
              ? new Date(activity.lastWithdrawalAt).toLocaleString("ar-EG")
              : "لا يوجد"}
          </p>
          <p>
            <span className="text-muted-foreground">الاشتراك النشط:</span>{" "}
            {activity.activeSubscription
              ? `${activity.activeSubscription.package_name} (حتى ${activity.activeSubscription.expires_at ? new Date(activity.activeSubscription.expires_at).toLocaleDateString("ar-EG") : "-"})`
              : "لا يوجد"}
          </p>
          <p>
            <span className="text-muted-foreground">إجمالي الاشتراكات:</span> {totals.subscriptionsCount}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>جميع الاشتراكات</CardTitle>
          <CardDescription>عرض كامل لاشتراكات المستخدم الحالية والسابقة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {subscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد اشتراكات لهذا المستخدم حتى الآن</p>
          ) : (
            subscriptions.map((subscription) => (
              <div
                key={subscription.id}
                className="rounded-lg border border-border/60 p-3 space-y-2 bg-card/60"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-medium">{subscription.package_name}</p>
                  {getStatusBadge(subscription.status)}
                </div>
                <div className="grid gap-1 text-sm text-muted-foreground">
                  <p>تاريخ الإنشاء: {new Date(subscription.created_at).toLocaleString("ar-EG")}</p>
                  <p>
                    تاريخ البدء: {subscription.started_at ? new Date(subscription.started_at).toLocaleString("ar-EG") : "-"}
                  </p>
                  <p>
                    تاريخ الانتهاء: {subscription.expires_at ? new Date(subscription.expires_at).toLocaleString("ar-EG") : "-"}
                  </p>
                  <p className="break-all">TxHash: {subscription.tx_hash || "-"}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
