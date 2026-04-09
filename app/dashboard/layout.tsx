"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  Wallet, 
  LogOut,
  User,
  ArrowDownToLine,
  HandCoins,
  ChevronDown
} from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/dashboard/rate", label: "التقييم", icon: Play },
  { href: "/dashboard/subscribe", label: "VIP", icon: Star, isCenter: true },
]

const walletActions = [
  {
    href: "/dashboard/deposit",
    label: "إيداع",
    description: "شحن الرصيد عبر TRC20 أو BEP20",
    icon: ArrowDownToLine,
  },
  {
    href: "/dashboard/withdraw",
    label: "سحب",
    description: "إرسال أرباحك إلى محفظتك",
    icon: HandCoins,
  },
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

  const isWalletRoute = pathname.startsWith("/dashboard/withdraw") || pathname.startsWith("/dashboard/deposit")
  const isProfileRoute = pathname.startsWith("/profile")

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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={isWalletRoute ? "secondary" : "ghost"} size="sm" className="gap-2">
                  <Wallet className="h-4 w-4" />
                  المحفظة
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72">
                <DropdownMenuLabel className="text-right">إدارة المحفظة</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {walletActions.map((action) => {
                  const Icon = action.icon
                  const active = pathname.startsWith(action.href)
                  return (
                    <DropdownMenuItem key={action.href} asChild className="p-0 focus:bg-transparent">
                      <Link
                        href={action.href}
                        className={`flex w-full items-start gap-3 rounded-md p-3 transition-colors ${
                          active ? "bg-primary/10" : "hover:bg-muted"
                        }`}
                      >
                        <div className={`mt-0.5 rounded-md p-2 ${active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}>{action.label}</p>
                          <p className="text-xs text-muted-foreground">{action.description}</p>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium hidden sm:block">{user.fullName}</div>
              <div className="text-xs text-primary font-semibold">${user.balance_usdt.toFixed(2)}</div>
            </div>
            <Button variant={isProfileRoute ? "secondary" : "ghost"} size="icon" asChild className="hidden md:flex">
              <Link href="/dashboard/profile" aria-label="الملف الشخصي">
                <User className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="hidden md:flex hover:cursor-pointer">
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
                className="flex flex-col items-center py-2 px-3 min-w-15"
              >
                <Icon className={`h-6 w-6 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-xs mt-1 ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex flex-col items-center py-2 px-3 min-w-15">
                <Wallet className={`h-6 w-6 ${isWalletRoute ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-xs mt-1 ${isWalletRoute ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                  المحفظة
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="center" className="w-[min(92vw,22rem)] mb-2">
              <DropdownMenuLabel className="text-right">إدارة المحفظة</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {walletActions.map((action) => {
                const Icon = action.icon
                const active = pathname.startsWith(action.href)
                return (
                  <DropdownMenuItem key={action.href} asChild className="p-0 focus:bg-transparent">
                    <Link
                      href={action.href}
                      className={`flex w-full items-start gap-3 rounded-md p-3 transition-colors ${
                        active ? "bg-primary/10" : "hover:bg-muted"
                      }`}
                    >
                      <div className={`mt-0.5 rounded-md p-2 ${active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}>{action.label}</p>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Link
            href="/dashboard/profile"
            className="flex flex-col items-center py-2 px-3 min-w-15"
          >
            <User className={`h-6 w-6 ${isProfileRoute ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`text-xs mt-1 ${isProfileRoute ? 'text-primary font-medium' : 'text-muted-foreground'}`}>حسابي</span>
          </Link>
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
