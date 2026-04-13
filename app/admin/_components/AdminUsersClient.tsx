"use client"

import { memo, useCallback, useDeferredValue, useOptimistic, useReducer, useTransition, startTransition } from "react"
import Link from "next/link"
import { deleteAdminUser, setUserBanStatus, type AdminUserRow } from "@/lib/actions/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { Eye, Loader2, Search, Shield, Trash2, User as UserIcon, UserCheck, UserX } from "lucide-react"
import { AdminTablePagination } from "./AdminTablePagination"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  initialUsers: AdminUserRow[]
  fetchError?: string
  page: number
  count: number
  totalCount: number
  totalPages: number
}

// ─── Optimistic reducer ───────────────────────────────────────────────────────

type OptimisticAction =
  | { type: "TOGGLE_BAN"; id: string; isBanned: boolean }
  | { type: "REMOVE_USER"; id: string }

function optimisticReducer(users: AdminUserRow[], action: OptimisticAction): AdminUserRow[] {
  if (action.type === "TOGGLE_BAN") {
    return users.map((u) => (u.id === action.id ? { ...u, is_banned: action.isBanned } : u))
  }
  if (action.type === "REMOVE_USER") {
    return users.filter((u) => u.id !== action.id)
  }
  return users
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminUsersClient({
  initialUsers,
  fetchError,
  page,
  count,
  totalCount,
  totalPages,
}: Props) {
  const [optimisticUsers, dispatchOptimistic] = useOptimistic(initialUsers, optimisticReducer)

  const [searchQuery, setSearchQuery] = useReducer(
    (_: string, next: string) => next,
    "",
  )
  const deferredQuery = useDeferredValue(searchQuery)

  const [targetUser, setTargetUser] = useReducer(
    (_: AdminUserRow | null, next: AdminUserRow | null) => next,
    null,
  )

  const [isBanning, startBanTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()

  const [targetDeleteUser, setTargetDeleteUser] = useReducer(
    (_: AdminUserRow | null, next: AdminUserRow | null) => next,
    null,
  )

  if (fetchError) toast.error(fetchError)

  const filteredUsers =
    deferredQuery.trim() === ""
      ? optimisticUsers
      : optimisticUsers.filter(
          (u) =>
            (u.full_name ?? "").toLowerCase().includes(deferredQuery.toLowerCase()) ||
            (u.email ?? "").toLowerCase().includes(deferredQuery.toLowerCase()),
        )

  const handleConfirmBanStatus = useCallback(() => {
    if (!targetUser) return
    const nextBanned = !targetUser.is_banned

    startBanTransition(async () => {
      // Optimistically flip the badge instantly
      startTransition(() =>
        dispatchOptimistic({ type: "TOGGLE_BAN", id: targetUser.id, isBanned: nextBanned }),
      )

      const result = await setUserBanStatus({ userId: targetUser.id, isBanned: nextBanned })

      if (!result.success) {
        // Revert on failure
        startTransition(() =>
          dispatchOptimistic({ type: "TOGGLE_BAN", id: targetUser.id, isBanned: !nextBanned }),
        )
        toast.error(result.error)
        return
      }

      toast.success(nextBanned ? "تم حظر المستخدم" : "تم إلغاء حظر المستخدم")
      setTargetUser(null)
    })
  }, [targetUser])

  const handleCloseDialog = useCallback((open: boolean) => {
    if (!open && !isBanning) setTargetUser(null)
  }, [isBanning])

  const handleConfirmDeleteUser = useCallback(() => {
    if (!targetDeleteUser) return

    startDeleteTransition(async () => {
      const result = await deleteAdminUser({ userId: targetDeleteUser.id })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      startTransition(() =>
        dispatchOptimistic({ type: "REMOVE_USER", id: targetDeleteUser.id }),
      )

      toast.success("تم حذف المستخدم بنجاح")
      setTargetDeleteUser(null)
    })
  }, [targetDeleteUser])

  const handleCloseDeleteDialog = useCallback((open: boolean) => {
    if (!open && !isDeleting) setTargetDeleteUser(null)
  }, [isDeleting])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">المستخدمون</h1>
        <p className="text-muted-foreground">إدارة جميع المستخدمين المسجلين</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>كل المستخدمين</CardTitle>
              <CardDescription>إجمالي المستخدمين: {optimisticUsers.length}</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث عن مستخدم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المستخدم</TableHead>
                  <TableHead>الرصيد</TableHead>
                  <TableHead>الدور</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>تاريخ الانضمام</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      لا يوجد مستخدمون
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      onBanClick={setTargetUser}
                      onDeleteClick={setTargetDeleteUser}
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

      <AlertDialog open={!!targetUser} onOpenChange={handleCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {targetUser?.is_banned ? "إلغاء حظر المستخدم" : "حظر المستخدم"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {targetUser?.is_banned
                ? `هل تريد إلغاء حظر ${targetUser?.full_name || "هذا المستخدم"}؟ سيتمكن من تسجيل الدخول مرة أخرى.`
                : `هل تريد حظر ${targetUser?.full_name || "هذا المستخدم"}؟ سيتم منعه من الوصول إلى حسابه.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBanning}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmBanStatus} disabled={isBanning}>
              {isBanning ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جارٍ التنفيذ...
                </span>
              ) : targetUser?.is_banned ? (
                "إلغاء الحظر"
              ) : (
                "حظر"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!targetDeleteUser} onOpenChange={handleCloseDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المستخدم</AlertDialogTitle>
            <AlertDialogDescription>
              {`هل أنت متأكد من حذف ${targetDeleteUser?.full_name || "هذا المستخدم"}؟ لا يمكن التراجع عن هذا الإجراء.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteUser} disabled={isDeleting}>
              {isDeleting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جارٍ الحذف...
                </span>
              ) : (
                "تأكيد الحذف"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Memoised row — only re-renders when this user's data changes ─────────────

interface UserRowProps {
  user: AdminUserRow
  onBanClick: (user: AdminUserRow) => void
  onDeleteClick: (user: AdminUserRow) => void
}

const UserRow = memo(function UserRow({ user, onBanClick, onDeleteClick }: UserRowProps) {
  return (
    <TableRow>
      <TableCell>
        <div>
          <div className="font-medium">{user.full_name || "بدون اسم"}</div>
          <div className="text-sm text-muted-foreground">{user.email}</div>
        </div>
      </TableCell>
      <TableCell className="font-medium">
        ${Number(user.balance_usdt).toFixed(2)}
      </TableCell>
      <TableCell>
        {user.is_admin ? (
          <Badge className="bg-primary/10 text-primary border-primary/20">
            <Shield className="h-3 w-3 mr-1" />
            مسؤول
          </Badge>
        ) : (
          <Badge variant="outline">
            <UserIcon className="h-3 w-3 mr-1" />
            مستخدم
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {user.is_banned ? (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20">محظور</Badge>
        ) : (
          <Badge variant="outline">نشط</Badge>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {new Date(user.created_at).toLocaleDateString("ar-EG")}
      </TableCell>
      <TableCell className="text-right">
        <div className="inline-flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/users/${user.id}`}>
              <Eye className="h-4 w-4 mr-1" />
              التفاصيل
            </Link>
          </Button>

          {!user.is_admin && (
            <>
              <Button
                size="sm"
                variant={user.is_banned ? "outline" : "destructive"}
                onClick={() => onBanClick(user)}
              >
                {user.is_banned ? (
                  <>
                    <UserCheck className="h-4 w-4 mr-1" />
                    إلغاء الحظر
                  </>
                ) : (
                  <>
                    <UserX className="h-4 w-4 mr-1" />
                    حظر
                  </>
                )}
              </Button>

              <Button size="sm" variant="outline" onClick={() => onDeleteClick(user)}>
                <Trash2 className="h-4 w-4 mr-1" />
                حذف
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
})