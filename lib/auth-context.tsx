"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react"
import type { User, AuthState } from "./types"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

interface RegisterParams {
  email: string
  password: string
  fullName: string
  referralCode?: string
}

interface AuthResult {
  success: boolean
  error?: string
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<AuthResult>
  register: (params: RegisterParams) => Promise<AuthResult>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabaseBrowserClient()
  const isMountedRef = useRef(true)
  const refreshInFlightRef = useRef<Promise<void> | null>(null)
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  })

  const toAppUser = useCallback(
    async (authUserId: string): Promise<User | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, wallet_address, balance_usdt, is_admin, is_banned, referral_code, referred_by, created_at")
        .eq("id", authUserId)
        .maybeSingle()

      if (error || !data) return null

      return {
        id: data.id,
        email: data.email ?? undefined,
        fullName: data.full_name ?? "",
        walletAddress: data.wallet_address ?? undefined,
        balance_usdt: Number(data.balance_usdt ?? 0),
        isAdmin: !!data.is_admin,
        isBanned: !!data.is_banned,
        inviteCode: data.referral_code ?? undefined,
        referredBy: data.referred_by ?? undefined,
        createdAt: data.created_at,
      }
    },
    [supabase]
  )

  const isAuthLockRaceError = useCallback((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    return message.includes("Lock \"lock:sb-") || message.includes("another request stole it")
  }, [])

  const safeSignOut = useCallback(async (localOnly = false) => {
    try {
      await supabase.auth.signOut(localOnly ? { scope: "local" } : undefined)
    } catch (error) {
      if (!isAuthLockRaceError(error)) {
        throw error
      }
    }
  }, [isAuthLockRaceError, supabase])

  const refreshUser = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current
    }

    const refreshTask = (async () => {
    let session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] = null

    try {
      const { data } = await supabase.auth.getSession()
      session = data.session
    } catch (error) {
      if (isAuthLockRaceError(error)) {
        return
      }

      throw error
    }

    if (!session?.user) {
      if (isMountedRef.current) {
        setState({ user: null, isLoading: false, isAuthenticated: false })
      }
      return
    }

    const appUser = await toAppUser(session.user.id)

    if (appUser?.isBanned) {
      await safeSignOut(true)
      if (isMountedRef.current) {
        setState({ user: null, isLoading: false, isAuthenticated: false })
      }
      return
    }

    if (isMountedRef.current) {
      setState({
        user: appUser,
        isLoading: false,
        isAuthenticated: !!appUser,
      })
    }
    })()

    refreshInFlightRef.current = refreshTask
    try {
      await refreshTask
    } finally {
      refreshInFlightRef.current = null
    }
  }, [safeSignOut, supabase, toAppUser])

  useEffect(() => {
    isMountedRef.current = true
    refreshUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshUser()
    })

    return () => {
      isMountedRef.current = false
      subscription.unsubscribe()
    }
  }, [refreshUser, supabase])

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const normalizedEmail = email.trim().toLowerCase()
      const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })

      if (error || !data.user) {
        return { success: false, error: "بيانات تسجيل الدخول غير صحيحة" }
      }

      const appUser = await toAppUser(data.user.id)
      if (!appUser) {
        await safeSignOut(true)
        return { success: false, error: "تعذر تحميل بيانات الحساب" }
      }

      if (appUser.isBanned) {
        await safeSignOut(true)
        return {
          success: false,
          error: "تم حظر هذا الحساب. يرجى التواصل مع الدعم.",
        }
      }

      setState({ user: appUser, isLoading: false, isAuthenticated: true })
      return { success: true }
    },
    [supabase, toAppUser]
  )

  const register = useCallback(
    async ({ email, password, fullName, referralCode }: RegisterParams): Promise<AuthResult> => {
      const normalizedEmail = email.trim().toLowerCase()

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          fullName,
          referralCode: referralCode?.trim() ? referralCode.trim().toUpperCase() : undefined,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        return { success: false, error: payload?.error ?? "فشل إنشاء الحساب" }
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (signInError) {
        return { success: false, error: "تم إنشاء الحساب لكن تعذر تسجيل الدخول تلقائيا" }
      }

      await refreshUser()
      return { success: true }
    },
    [refreshUser, supabase]
  )

  const logout = useCallback(async () => {
    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    })

    // Local sign-out avoids waiting on network retries and lock recovery.
    await safeSignOut(true)
  }, [safeSignOut])

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
