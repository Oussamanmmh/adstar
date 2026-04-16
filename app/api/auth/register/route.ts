import { NextResponse } from "next/server"
import { z } from "zod"

import { createSupabaseAdminClient } from "@/lib/supabase/admin"

const registerRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().trim().min(2),
  referralCode: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => value === "" || /^[A-Z0-9]{8}$/.test(value), "invalid referral code")
    .optional(),
})

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const parsed = registerRequestSchema.safeParse(payload)

    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات التسجيل غير صالحة" }, { status: 400 })
    }

    const { email, password, fullName, referralCode } = parsed.data
    const admin = createSupabaseAdminClient()

    let normalizedReferralCode: string | undefined
    if (referralCode && referralCode.trim() !== "") {
      normalizedReferralCode = referralCode.trim().toUpperCase()

      const { data: inviter, error: inviterError } = await admin
        .from("profiles")
        .select("id")
        .eq("referral_code", normalizedReferralCode)
        .maybeSingle()

      if (inviterError || !inviter) {
        return NextResponse.json({ error: "رمز الإحالة غير صحيح" }, { status: 400 })
      }
    }

    const { error } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        ...(normalizedReferralCode ? { referral_code: normalizedReferralCode } : {}),
      },
    })

    if (error) {
      if (error.message.toLowerCase().includes("already")) {
        return NextResponse.json({ error: "هذا البريد الإلكتروني مسجل بالفعل" }, { status: 409 })
      }

      return NextResponse.json({ error: "فشل إنشاء الحساب" }, { status: 400 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "حدث خطأ غير متوقع أثناء إنشاء الحساب" }, { status: 500 })
  }
}