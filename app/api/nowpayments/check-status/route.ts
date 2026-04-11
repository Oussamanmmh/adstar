import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get("paymentId")

    if (!paymentId) {
      return NextResponse.json({ error: "معرّف الدفع مطلوب" }, { status: 400 })
    }

    const apiKey = process.env.NOWPAYMENTS_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: "إعدادات الدفع غير مكتملة: مفتاح NOWPayments مفقود" }, { status: 500 })
    }

    const response = await fetch(`https://api.nowpayments.io/v1/payment/${encodeURIComponent(paymentId)}`, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
      },
      cache: "no-store",
    })

    const responseJson = await response.json().catch(() => null)

    if (!response.ok || !responseJson) {
      const apiMessage =
        typeof responseJson?.message === "string"
          ? responseJson.message
          : "تعذر التحقق من حالة الدفع"

      return NextResponse.json({ error: `فشل التحقق من الحالة: ${apiMessage}` }, { status: response.status || 502 })
    }

    return NextResponse.json({
      status: responseJson.payment_status,
      actuallyPaid: Number(responseJson.actually_paid ?? 0),
    })
  } catch {
    return NextResponse.json(
      { error: "تعذر الاتصال بخدمة الدفع حاليًا، حاول مرة أخرى بعد قليل" },
      { status: 503 },
    )
  }
}
