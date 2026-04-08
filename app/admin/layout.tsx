"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  Star, 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Wallet, 
  Video,
  LogOut,
  Shield,
  User
} from "lucide-react"

const navItems = [
  { href: "/admin", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/admin/users", label: "المستخدمون", icon: Users },
  { href: "/admin/subscriptions", label: "الاشتراكات", icon: CreditCard, isCenter: true },
  { href: "/admin/withdrawals", label: "السحوبات", icon: Wallet },
  { href: "/admin/videos", label: "الفيديوهات", icon: Video },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login")
    }
    // Redirect non-admin to user dashboard
    if (!isLoading && user && !user.isAdmin) {
      router.push("/dashboard")
    }
  }, [isLoading, isAuthenticated, user, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!isAuthenticated || !user || !user.isAdmin) {
    return null
  }

  const handleLogout = () => {
    setIsLogoutDialogOpen(true)
  }

  const confirmLogout = async () => {
    setIsLogoutDialogOpen(false)
    await logout()
    router.replace("/")
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Header - Simplified */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2">
            <Star className="h-6 w-6 text-primary fill-primary" />
            <span className="text-lg font-bold">Adstar</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <Shield className="h-3 w-3" />
              إدارة
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant={pathname === item.href ? "secondary" : "ghost"}
                size="sm"
                asChild
              >
                <Link href={item.href} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium">{user.fullName}</div>
              <div className="text-xs text-muted-foreground">مسؤول النظام</div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="hidden md:flex">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Add bottom padding for mobile nav */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full pb-24 md:pb-6">
        {children}
      </main>

      {/* Mobile Bottom Navigation - App Style */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
        <div className="flex items-end justify-around px-1 py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            
            if (item.isCenter) {
              // Center elevated button
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center -mt-5"
                >
                  <div className={`
                    w-14 h-14 rounded-full flex items-center justify-center
                    ${isActive 
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' 
                      : 'bg-primary/80 text-primary-foreground'
                    }
                  `}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className={`text-xs mt-1 ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {item.label}
                  </span>
                </Link>
              )
            }
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center py-2 px-2 min-w-[50px]"
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-xs mt-1 ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
          
          {/* Me / Profile with logout */}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center py-2 px-2 min-w-[50px]"
          >
            <User className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs mt-1 text-muted-foreground">حسابي</span>
          </button>
        </div>
      </nav>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تسجيل الخروج؟</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد أنك تريد تسجيل الخروج؟ ستحتاج إلى تسجيل الدخول مجدداً للوصول إلى حساب الإدارة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLogout} className="bg-destructive hover:bg-destructive/90">
              تسجيل الخروج
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
