// app/admin/packages/_components/AdminPackagesClient.tsx
"use client"

import { useCallback, useOptimistic, useReducer, useTransition, startTransition } from "react"
import { useRouter } from "next/navigation"
import {
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
import { AdminTablePagination } from "./AdminTablePagination"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  initialPackages: AdminPackageRow[]
  fetchError?: string
  page: number
  count: number
  totalCount: number
  totalPages: number
}

// Consolidate all 6 form fields into a single object → 1 re-render on open
interface FormState {
  name: string
  priceUsdt: string
  dailyEarnings: string
  durationDays: string
  videosPerDay: string
  isActive: boolean
}

type FormAction =
  | { type: "SET_FIELD"; field: keyof FormState; value: string | boolean }
  | { type: "RESET" }
  | { type: "LOAD"; payload: AdminPackageRow }

const DEFAULT_FORM: FormState = {
  name: "",
  priceUsdt: "",
  dailyEarnings: "",
  durationDays: "",
  videosPerDay: "1",
  isActive: true,
}

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value }
    case "RESET":
      return DEFAULT_FORM
    case "LOAD":
      return {
        name: action.payload.name,
        priceUsdt: String(action.payload.price_usdt),
        dailyEarnings: String(action.payload.daily_earnings),
        durationDays: String(action.payload.duration_days),
        videosPerDay: String(action.payload.videos_per_day),
        isActive: action.payload.is_active,
      }
    default:
      return state
  }
}

// ─── Optimistic update actions ─────────────────────────────────────────────

type OptimisticAction =
  | { type: "TOGGLE"; id: string; isActive: boolean }
  | { type: "DELETE"; id: string }
  | { type: "ADD"; pkg: AdminPackageRow }
  | { type: "UPDATE"; pkg: AdminPackageRow }

function optimisticReducer(
  packages: AdminPackageRow[],
  action: OptimisticAction,
): AdminPackageRow[] {
  switch (action.type) {
    case "TOGGLE":
      return packages.map((p) =>
        p.id === action.id ? { ...p, is_active: action.isActive } : p,
      )
    case "DELETE":
      return packages.filter((p) => p.id !== action.id)
    case "ADD":
      return [...packages, action.pkg]
    case "UPDATE":
      return packages.map((p) => (p.id === action.pkg.id ? action.pkg : p))
  }
}

function toNumber(value: string): number {
  const parsed = Number(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminPackagesClient({
  initialPackages,
  fetchError,
  page,
  count,
  totalCount,
  totalPages,
}: Props) {
  const router = useRouter()

  // ✅ useOptimistic for instant UI feedback without full refetch
  const [optimisticPackages, dispatchOptimistic] = useOptimistic(
    initialPackages,
    optimisticReducer,
  )

  // ✅ Single reducer for all form fields — one re-render on open instead of 6
  const [form, dispatchForm] = useReducer(formReducer, DEFAULT_FORM)

  const [editingPackage, setEditingPackage] = useReducer(
    (_: AdminPackageRow | null, next: AdminPackageRow | null) => next,
    null,
  )
  const [isAddDialogOpen, setIsAddDialogOpen] = useReducer(
    (_: boolean, next: boolean) => next,
    false,
  )
  const [deletePackageRow, setDeletePackageRow] = useReducer(
    (_: AdminPackageRow | null, next: AdminPackageRow | null) => next,
    null,
  )

  // ✅ useTransition tracks pending state without blocking the UI
  const [isSubmitting, startSubmitTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()

  // ─── Show fetch error once on mount ────────────────────────────────────────
  if (fetchError) {
    // Server already showed this but toast it for visibility
    toast.error(fetchError)
  }

  // ─── Handlers (useCallback = stable refs, no unnecessary re-renders) ───────

  const handleOpenAddDialog = useCallback(() => {
    dispatchForm({ type: "RESET" })
    setEditingPackage(null)
    setIsAddDialogOpen(true)
  }, [])

  const handleOpenEditDialog = useCallback((row: AdminPackageRow) => {
    dispatchForm({ type: "LOAD", payload: row })
    setEditingPackage(row)
    setIsAddDialogOpen(false)
  }, [])

  const handleCloseDialog = useCallback(() => {
    setIsAddDialogOpen(false)
    setEditingPackage(null)
    dispatchForm({ type: "RESET" })
  }, [])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      if (!form.name.trim()) {
        toast.error("يرجى إدخال اسم الباقة")
        return
      }

      const payload = {
        name: form.name.trim(),
        priceUsdt: toNumber(form.priceUsdt),
        dailyEarnings: toNumber(form.dailyEarnings),
        durationDays: toNumber(form.durationDays),
        videosPerDay: toNumber(form.videosPerDay),
        isActive: form.isActive,
      }

      startSubmitTransition(async () => {
        if (editingPackage) {
          // Optimistically update row immediately
          startTransition(() =>
            dispatchOptimistic({
              type: "UPDATE",
              pkg: {
                ...editingPackage,
                name: payload.name,
                price_usdt: payload.priceUsdt,
                daily_earnings: payload.dailyEarnings,
                duration_days: payload.durationDays,
                videos_per_day: payload.videosPerDay,
                is_active: payload.isActive,
              },
            }),
          )

          const result = await updateAdminPackage({ id: editingPackage.id, ...payload })
          if (!result.success) {
            toast.error(result.error)
            return
          }
          toast.success("تم تحديث الباقة")
        } else {
          const result = await createAdminPackage(payload)
          if (!result.success) {
            toast.error(result.error)
            return
          }
          toast.success("تمت إضافة الباقة")
          // router.refresh() re-runs the Server Component and gets the real
          // new row from the DB — avoids needing result.data from the action
          router.refresh()
        }

        handleCloseDialog()
      })
    },
    [form, editingPackage, handleCloseDialog],
  )

  const handleTogglePackageStatus = useCallback(
    (row: AdminPackageRow, nextValue: boolean) => {
      // ✅ Instant toggle — no loading spinner, no full refetch
      startTransition(() => dispatchOptimistic({ type: "TOGGLE", id: row.id, isActive: nextValue }))

      void toggleAdminPackageStatus({ id: row.id, isActive: nextValue }).then((result) => {
        if (!result.success) {
          // Revert optimistic update on failure
          startTransition(() =>
            dispatchOptimistic({ type: "TOGGLE", id: row.id, isActive: !nextValue }),
          )
          toast.error(result.error)
        }
      })
    },
    [],
  )

  const handleDeletePackage = useCallback(() => {
    if (!deletePackageRow) return

    startDeleteTransition(async () => {
      // Optimistically remove from list immediately
      startTransition(() => dispatchOptimistic({ type: "DELETE", id: deletePackageRow.id }))

      const result = await deleteAdminPackage({ id: deletePackageRow.id })

      if (!result.success) {
        // Revert: re-add the row back
        startTransition(() => dispatchOptimistic({ type: "ADD", pkg: deletePackageRow }))
        toast.error(result.error)
        return
      }

      toast.success("تم حذف الباقة")
      setDeletePackageRow(null)
    })
  }, [deletePackageRow])

  // ─── Render ────────────────────────────────────────────────────────────────

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
          <CardDescription>إجمالي الباقات: {optimisticPackages.length}</CardDescription>
        </CardHeader>

        <CardContent>
          {optimisticPackages.length === 0 ? (
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
                  {optimisticPackages.map((row) => (
                    <PackageRow
                      key={row.id}
                      row={row}
                      onEdit={handleOpenEditDialog}
                      onToggle={handleTogglePackageStatus}
                      onDelete={setDeletePackageRow}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <AdminTablePagination
            page={page}
            count={count}
            totalCount={totalCount}
            totalPages={totalPages}
          />
        </CardContent>
      </Card>

      {/* ── Add / Edit Dialog ── */}
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
              <Input
                id="name"
                value={form.name}
                onChange={(e) => dispatchForm({ type: "SET_FIELD", field: "name", value: e.target.value })}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="priceUsdt">السعر (USDT)</FieldLabel>
                <Input
                  id="priceUsdt"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.priceUsdt}
                  onChange={(e) => dispatchForm({ type: "SET_FIELD", field: "priceUsdt", value: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="dailyEarnings">الربح اليومي (USDT)</FieldLabel>
                <Input
                  id="dailyEarnings"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.dailyEarnings}
                  onChange={(e) => dispatchForm({ type: "SET_FIELD", field: "dailyEarnings", value: e.target.value })}
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
                  value={form.durationDays}
                  onChange={(e) => dispatchForm({ type: "SET_FIELD", field: "durationDays", value: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="videosPerDay">عدد الفيديوهات يومياً</FieldLabel>
                <Input
                  id="videosPerDay"
                  type="number"
                  min="1"
                  step="1"
                  value={form.videosPerDay}
                  onChange={(e) => dispatchForm({ type: "SET_FIELD", field: "videosPerDay", value: e.target.value })}
                />
              </Field>
            </div>

            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="isActive">نشطة</FieldLabel>
              <Switch
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(v) => dispatchForm({ type: "SET_FIELD", field: "isActive", value: v })}
              />
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

      {/* ── Delete Confirm Dialog ── */}
      <AlertDialog
        open={!!deletePackageRow}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeletePackageRow(null)
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

// ─── Extracted row component — prevents full table re-render on any state change ──

interface PackageRowProps {
  row: AdminPackageRow
  onEdit: (row: AdminPackageRow) => void
  onToggle: (row: AdminPackageRow, next: boolean) => void
  onDelete: (row: AdminPackageRow) => void
}

// memo() ensures this row only re-renders when its own data changes
import { memo } from "react"

const PackageRow = memo(function PackageRow({ row, onEdit, onToggle, onDelete }: PackageRowProps) {
  return (
    <TableRow>
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
            onCheckedChange={(checked) => onToggle(row, checked)}
          />
          <Button size="icon" variant="ghost" onClick={() => onEdit(row)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => onDelete(row)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
})