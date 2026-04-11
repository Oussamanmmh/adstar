import { NextResponse } from "next/server"
import { z } from "zod"

import { createSupabaseServerClient } from "@/lib/supabase/server"

const createPaymentSchema = z.object({
  network: z.enum(["trc20", "bep20"]),
  userId: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولًا" }, { status: 401 })
    }

    const payload = await request.json()
    const parsed = createPaymentSchema.safeParse(payload)

    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات الطلب غير صالحة" }, { status: 400 })
    }

    const { network, userId } = parsed.data

    if (user.id !== userId) {
      return NextResponse.json({ error: "غير مصرح بإنشاء دفعة لهذا المستخدم" }, { status: 403 })
    }

    const apiKey = process.env.NOWPAYMENTS_API_KEY
    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    if (!apiKey) {
      return NextResponse.json({ error: "إعدادات الدفع غير مكتملة: مفتاح NOWPayments مفقود" }, { status: 500 })
    }

    if (!appUrl) {
      return NextResponse.json({ error: "إعدادات الدفع غير مكتملة: رابط التطبيق مفقود" }, { status: 500 })
    }

    const payCurrency = network === "trc20" ? "usdttrc20" : "usdtbsc"

    const minRes = await fetch(
      `https://api.nowpayments.io/v1/min-amount?currency_from=${payCurrency}&currency_to=${payCurrency}`,
      {
        headers: {
          "x-api-key": apiKey,
        },
        cache: "no-store",
      },
    )

    const minJson = await minRes.json().catch(() => null)
    const rawMinAmount = Number(minJson?.min_amount)
    const minAmount = Number.isFinite(rawMinAmount) && rawMinAmount > 0 ? rawMinAmount : 10
    const bufferedAmount = Math.ceil(minAmount * 1.05)

    const nowPaymentsPayload = {
      price_amount: bufferedAmount,
      price_currency: payCurrency,
      pay_currency: payCurrency,
      ipn_callback_url: `${appUrl}/api/webhooks/nowpayments`,
      order_id: userId,
      order_description: "Adstar deposit",
    }

    const response = await fetch("https://api.nowpayments.io/v1/payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(nowPaymentsPayload),
      cache: "no-store",
    })

    const responseJson = await response.json().catch(() => null)

    if (!response.ok || !responseJson) {
      const apiMessage =
        typeof responseJson?.message === "string"
          ? responseJson.message
          : "تعذر إنشاء طلب الدفع في الوقت الحالي"

      return NextResponse.json({ error: `فشل إنشاء الدفع: ${apiMessage}` }, { status: response.status || 502 })
    }

    return NextResponse.json({
      paymentId: responseJson.payment_id,
      payAddress: responseJson.pay_address,
      payAmount: responseJson.pay_amount,
      paymentStatus: responseJson.payment_status,
    })
  } catch {
    return NextResponse.json({ error: "حدث خطأ غير متوقع أثناء إنشاء الدفع" }, { status: 500 })
  }
}
