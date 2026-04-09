"use client"

import { useEffect, useState } from "react"
import {
  getAdminPackages,
  createAdminPackage,
  updateAdminPackage,
  toggleAdminPackageStatus,
  deleteAdminPackage,
  type AdminPackageRow,
} from "@/lib/actions/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { CreditCard, Loader2, Pencil, Plus, Trash2 } from "lucide-react"

function toNumber(value: string): number {
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return 0
  return parsed
}

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<AdminPackageRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editingPackage, setEditingPackage] = useState<AdminPackageRow | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [deletePackageRow, setDeletePackageRow] = useState<AdminPackageRow | null>(null)

  const [name, setName] = useState("")
  const [priceUsdt, setPriceUsdt] = useState("")
  const [dailyEarnings, setDailyEarnings] = useState("")
  const [durationDays, setDurationDays] = useState("")
  const [videosPerDay, setVideosPerDay] = useState("")
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    void loadPackages()
  }, [])

  async function loadPackages() {
    setIsLoading(true)
    const result = await getAdminPackages()

    if (!result.success) {
      toast.error(result.error)
      setIsLoading(false)
      return
    }

    setPackages(result.data)
    setIsLoading(false)
  }

  function resetForm() {
    setName("")
    setPriceUsdt("")
    setDailyEarnings("")
    setDurationDays("")
    setVideosPerDay("1")
    setIsActive(true)
  }

  function handleOpenAddDialog() {
    resetForm()
    setEditingPackage(null)
    setIsAddDialogOpen(true)
  }

  function handleOpenEditDialog(row: AdminPackageRow) {
    setEditingPackage(row)
    setName(row.name)
    setPriceUsdt(String(row.price_usdt))
    setDailyEarnings(String(row.daily_earnings))
    setDurationDays(String(row.duration_days))
    setVideosPerDay(String(row.videos_per_day))
    setIsActive(row.is_active)
    setIsAddDialogOpen(false)
  }

  function handleCloseDialog() {
    setIsAddDialogOpen(false)
    setEditingPackage(null)
    setIsSubmitting(false)
    resetForm()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("يرجى إدخال اسم الباقة")
      return
    }

    const payload = {
      name: name.trim(),
      priceUsdt: toNumber(priceUsdt),
      dailyEarnings: toNumber(dailyEarnings),
      durationDays: toNumber(durationDays),
      videosPerDay: toNumber(videosPerDay),
      isActive,
    }

    setIsSubmitting(true)

    if (editingPackage) {
      const result = await updateAdminPackage({
        id: editingPackage.id,
        ...payload,
      })

      if (!result.success) {
        toast.error(result.error)
        setIsSubmitting(false)
        return
      }

      toast.success("تم تحديث الباقة")
    } else {
      const result = await createAdminPackage(payload)

      if (!result.success) {
        toast.error(result.error)
        setIsSubmitting(false)
        return
      }

      toast.success("تمت إضافة الباقة")
    }

    handleCloseDialog()
    await loadPackages()
  }

  async function handleTogglePackageStatus(row: AdminPackageRow, nextValue: boolean) {
    const result = await toggleAdminPackageStatus({ id: row.id, isActive: nextValue })

    if (!result.success) {
      toast.error(result.error)
      return
    }

    await loadPackages()
  }

  async function handleDeletePackage() {
    if (!deletePackageRow || isDeleting) return

    setIsDeleting(true)
    const result = await deleteAdminPackage({ id: deletePackageRow.id })

    if (!result.success) {
      toast.error(result.error)
      setIsDeleting(false)
      return
    }

    toast.success("تم حذف الباقة")
    setDeletePackageRow(null)
    setIsDeleting(false)
    await loadPackages()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">الباقات</h1>
          <p className="text-muted-foreground">إدارة باقات الاشتراك والأسعار اليومية</p>
        </div>
        <Button onClick={handleOpenAddDialog} className="text-white">
          <Plus className="h-4 w-4 mr-2" />
          إضافة باقة
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>جميع الباقات</CardTitle>
          <CardDescription>إجمالي الباقات: {isLoading ? "..." : packages.length}</CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد باقات بعد</p>
              <p className="text-sm">أضف أول باقة للبدء</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم الباقة</TableHead>
                    <TableHead>السعر</TableHead>
                    <TableHead>الربح اليومي</TableHead>
                    <TableHead>المدة</TableHead>
                    <TableHead>فيديوهات/يوم</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-semibold">{row.name}</TableCell>
                      <TableCell>${Number(row.price_usdt).toFixed(2)}</TableCell>
                      <TableCell>${Number(row.daily_earnings).toFixed(2)}</TableCell>
                      <TableCell>{row.duration_days} يوم</TableCell>
                      <TableCell>{row.videos_per_day}</TableCell>
                      <TableCell>
                        {row.is_active ? (
                          <Badge className="bg-primary/10 text-primary border-primary/20">نشطة</Badge>
                        ) : (
                          <Badge variant="outline">غير نشطة</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">نشطة</span>
                          <Switch
                            checked={row.is_active}
                            onCheckedChange={(checked) => {
                              void handleTogglePackageStatus(row, checked)
                            }}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenEditDialog(row)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeletePackageRow(row)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen || !!editingPackage} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPackage ? "تعديل الباقة" : "إضافة باقة جديدة"}</DialogTitle>
            <DialogDescription>
              {editingPackage ? "حدّث بيانات الباقة بالأسفل" : "أدخل بيانات الباقة الجديدة"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field>
              <FieldLabel htmlFor="name">اسم الباقة</FieldLabel>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="priceUsdt">السعر (USDT)</FieldLabel>
                <Input
                  id="priceUsdt"
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceUsdt}
                  onChange={(e) => setPriceUsdt(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="dailyEarnings">الربح اليومي (USDT)</FieldLabel>
                <Input
                  id="dailyEarnings"
                  type="number"
                  min="0"
                  step="0.01"
                  value={dailyEarnings}
                  onChange={(e) => setDailyEarnings(e.target.value)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="durationDays">المدة (يوم)</FieldLabel>
                <Input
                  id="durationDays"
                  type="number"
                  min="1"
                  step="1"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="videosPerDay">عدد الفيديوهات يومياً</FieldLabel>
                <Input
                  id="videosPerDay"
                  type="number"
                  min="1"
                  step="1"
                  value={videosPerDay}
                  onChange={(e) => setVideosPerDay(e.target.value)}
                />
              </Field>
            </div>

            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="isActive">نشطة</FieldLabel>
              <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={handleCloseDialog}>
                إلغاء
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ الحفظ...
                  </span>
                ) : editingPackage ? (
                  "حفظ التغييرات"
                ) : (
                  "إضافة الباقة"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletePackageRow}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeletePackageRow(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الباقة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف باقة {deletePackageRow?.name ?? ""}؟
              <br />
              سيتم منع الحذف إذا كانت الباقة مرتبطة باشتراكات نشطة أو معلقة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePackage}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جارٍ الحذف...
                </span>
              ) : (
                "حذف"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
