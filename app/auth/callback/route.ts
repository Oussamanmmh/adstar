import { createServerClient } from "@supabase/ssr"
import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env"

const otpTypes = new Set<EmailOtpType>([
  "signup",
  "recovery",
  "invite",
  "email",
  "email_change",
])

export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl
  const code = requestUrl.searchParams.get("code")
  const tokenHash = requestUrl.searchParams.get("token_hash")
  const typeParam = requestUrl.searchParams.get("type")
  const nextPath = requestUrl.searchParams.get("next")

  const redirectTo = new URL("/auth/login", request.url)
  if (nextPath?.startsWith("/")) {
    redirectTo.pathname = nextPath
  }

  const response = NextResponse.redirect(redirectTo)
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }

    return response
  }

  if (tokenHash && typeParam && otpTypes.has(typeParam as EmailOtpType)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: typeParam as EmailOtpType,
    })

    if (error) {
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }

    return response
  }

  return NextResponse.redirect(new URL("/auth/login", request.url))
}
