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
  Play, 
  CreditCard, 
  Wallet, 
  LogOut,
  User
} from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/dashboard/rate", label: "التقييم", icon: Play },
  { href: "/dashboard/subscribe", label: "VIP", icon: Star, isCenter: true },
  { href: "/dashboard/withdraw", label: "المحفظة", icon: Wallet },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login")
    }
    // Redirect admin to admin panel
    if (!isLoading && user?.isAdmin) {
      router.push("/admin")
    }
  }, [isLoading, isAuthenticated, user, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
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
            <div className="text-right">
              <div className="text-sm font-medium hidden sm:block">{user.fullName}</div>
              <div className="text-xs text-primary font-semibold">${user.balance_usdt.toFixed(2)}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="hidden md:flex">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Add bottom padding for mobile nav */}
      <main className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full pb-24 md:pb-6">
        {children}
      </main>

      {/* Mobile Bottom Navigation - App Style */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
        <div className="flex items-end justify-around px-2 py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            
            if (item.isCenter) {
              // Center elevated button (VIP)
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
                className="flex flex-col items-center py-2 px-3 min-w-[60px]"
              >
                <Icon className={`h-6 w-6 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-xs mt-1 ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
          
          {/* Me / Profile with logout */}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center py-2 px-3 min-w-[60px]"
          >
            <User className="h-6 w-6 text-muted-foreground" />
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
              هل أنت متأكد أنك تريد تسجيل الخروج؟ ستحتاج إلى تسجيل الدخول مرة أخرى للوصول إلى حسابك.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLogout} className="bg-destructive hover:bg-destructive/90 text-white">
              تسجيل الخروج
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
