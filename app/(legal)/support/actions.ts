// app/(legal)/support/actions.ts
"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const SupportSchema = z.object({
  fullName: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل").max(100),
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  category: z.enum(["subscription", "rating", "withdrawal", "account", "other"], {
    errorMap: () => ({ message: "يرجى اختيار نوع المشكلة" }),
  }),
  txHash: z.string().optional(),
  message: z.string().min(20, "يرجى كتابة رسالة لا تقل عن 20 حرفاً").max(2000),
})

type SupportState = {
  success: boolean
  error?: string
} | null

export async function submitSupportRequest(
  _prevState: SupportState,
  formData: FormData
): Promise<SupportState> {
  const raw = {
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    category: formData.get("category"),
    txHash: formData.get("txHash") || undefined,
    message: formData.get("message"),
  }

  const parsed = SupportSchema.safeParse(raw)

  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message ?? "بيانات غير صحيحة"
    return { success: false, error: firstError }
  }

  try {
    const supabase = await createClient()

    // Optional: store support tickets in a `support_tickets` table
    // Uncomment and create the table if you want persistence:
    //
    // const { error } = await supabase.from("support_tickets").insert({
    //   full_name: parsed.data.fullName,
    //   email: parsed.data.email,
    //   category: parsed.data.category,
    //   tx_hash: parsed.data.txHash ?? null,
    //   message: parsed.data.message,
    //   status: "open",
    // })
    //
    // if (error) throw error

    // For now, simulate processing delay
    await new Promise((r) => setTimeout(r, 800))

    return { success: true }
  } catch (err) {
    console.error("Support submission error:", err)
    return {
      success: false,
      error: "حدث خطأ أثناء إرسال طلبك. يرجى المحاولة مرة أخرى.",
    }
  }
}