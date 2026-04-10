"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react"
import type { User, AuthState } from "./types"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

interface RegisterParams {
  email: string
  password: string
  fullName: string
}

interface AuthResult {
  success: boolean
  error?: string
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<AuthResult>
  register: (params: RegisterParams) => Promise<AuthResult>
  startAdminLogin: (email: string, password: string) => Promise<AuthResult>
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
        .select("id, full_name, email, wallet_address, balance_usdt, is_admin, is_banned, created_at")
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

      if (appUser.isAdmin) {
        await safeSignOut(true)
        return {
          success: false,
          error: "حساب الإدارة يتطلب تأكيد رمز البريد الإلكتروني. استخدم تسجيل دخول الإدارة.",
        }
      }

      setState({ user: appUser, isLoading: false, isAuthenticated: true })
      return { success: true }
    },
    [supabase, toAppUser]
  )

  const register = useCallback(
    async ({ email, password, fullName }: RegisterParams): Promise<AuthResult> => {
      const normalizedEmail = email.trim().toLowerCase()

      const callbackUrl =
        typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: callbackUrl,
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (!data.session) {
        return {
          success: true,
        }
      }

      await refreshUser()
      return { success: true }
    },
    [refreshUser, supabase]
  )

  const startAdminLogin = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const normalizedEmail = email.trim().toLowerCase()

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (error || !data.user) {
        return { success: false, error: "بيانات تسجيل الدخول غير صحيحة" }
      }

      const appUser = await toAppUser(data.user.id)
      if (!appUser?.isAdmin) {
        await safeSignOut(true)
        return { success: false, error: "هذا الحساب ليس حساب مسؤول" }
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
        startAdminLogin,
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
