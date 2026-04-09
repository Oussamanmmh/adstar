"use client"

import { useEffect, useState } from "react"
import { getAdminUsers, type AdminUserRow } from "@/lib/actions/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { Search, Shield, User as UserIcon } from "lucide-react"

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    void loadUsers()
  }, [])

  async function loadUsers() {
    setIsLoading(true)
    const result = await getAdminUsers()

    if (!result.success) {
      toast.error(result.error)
      setIsLoading(false)
      return
    }

    setUsers(result.data)
    setIsLoading(false)
  }

  const filteredUsers = users.filter(user => 
    (user.full_name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.email ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  )

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
              <CardDescription>إجمالي المستخدمين: {isLoading ? "..." : users.length}</CardDescription>
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
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المستخدم</TableHead>
                  <TableHead>الرصيد</TableHead>
                  <TableHead>الدور</TableHead>
                  <TableHead>تاريخ الانضمام</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      لا يوجد مستخدمون
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
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
                      <TableCell className="text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString("ar-EG")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
