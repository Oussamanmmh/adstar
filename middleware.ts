import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_SUPABASE_URL
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_SUPABASE_ANON_KEY

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return response
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const code = request.nextUrl.searchParams.get("code")
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const {
        data: { user: exchangedUser },
      } = await supabase.auth.getUser()

      if (exchangedUser) {
        const { data: exchangedProfile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", exchangedUser.id)
          .maybeSingle()

        const isAdminAfterExchange = !!exchangedProfile?.is_admin
        return NextResponse.redirect(new URL(isAdminAfterExchange ? "/admin" : "/dashboard", request.url))
      }
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthPage = pathname.startsWith("/auth")
  const isDashboardRoute = pathname.startsWith("/dashboard")
  const isAdminRoute = pathname.startsWith("/admin")

  if ((isDashboardRoute || isAdminRoute) && !user) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  if (!user) {
    return response
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle()

  const isAdmin = !!profile?.is_admin

  if (isAdminRoute && !isAdmin) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (isDashboardRoute && isAdmin) {
    return NextResponse.redirect(new URL("/admin", request.url))
  }

  if (isAuthPage) {
    return NextResponse.redirect(new URL(isAdmin ? "/admin" : "/dashboard", request.url))
  }

  return response
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/admin/:path*", "/auth/:path*"],
}
