import crypto from "node:crypto"

import { NextResponse } from "next/server"

import { sendDepositConfirmationEmail } from "@/lib/email/send-deposit-confirmation"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import type { Network } from "@/lib/types"

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[]
type JsonObject = { [key: string]: JsonValue }

type NowPaymentsWebhookBody = {
  payment_status?: string
  order_id?: string
  actually_paid?: number | string
  payment_id?: string | number
  pay_currency?: string
}

function sortJsonValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue)
  }

  if (value !== null && typeof value === "object") {
    const sortedEntries = Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nestedValue]) => [key, sortJsonValue(nestedValue)] as const)

    return Object.fromEntries(sortedEntries)
  }

  return value
}

function toSortedJsonString(value: unknown): string {
  const normalized = sortJsonValue((value ?? null) as JsonValue)
  return JSON.stringify(normalized)
}

function getNetworkFromCurrency(payCurrency: string | undefined): Network {
  return payCurrency === "usdttrc20" ? "trc20" : "bep20"
}

function toSafeAmount(value: number | string | undefined): number {
  const asNumber = Number(value ?? 0)
  if (!Number.isFinite(asNumber) || asNumber <= 0) {
    return 0
  }

  return Math.floor(asNumber * 100) / 100
}

function isMatchingSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false

  const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex")

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  try {
    const secret = process.env.NOWPAYMENTS_IPN_SECRET

    if (!secret) {
      console.error("NOWPAYMENTS_IPN_SECRET is missing")
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const signature = request.headers.get("x-nowpayments-sig")
    const bodyText = await request.text()

    let parsedBody: NowPaymentsWebhookBody

    try {
      parsedBody = JSON.parse(bodyText) as NowPaymentsWebhookBody
    } catch {
      console.error("Invalid NOWPayments webhook payload")
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const canonicalBody = toSortedJsonString(parsedBody)
    const signatureValid = isMatchingSignature(canonicalBody, signature, secret)

    if (!signatureValid) {
      console.warn("NOWPayments signature mismatch", {
        paymentId: parsedBody.payment_id,
      })
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const payment_status = parsedBody.payment_status
    const actually_paid = toSafeAmount(parsedBody.actually_paid)

    if (
      (payment_status === "finished" || payment_status === "partially_paid") &&
      actually_paid > 0
    ) {
      // Continue processing.
    } else {
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const orderId = parsedBody.order_id
    const paymentId = String(parsedBody.payment_id ?? "")
    const actuallyPaid = actually_paid

    if (!orderId || !paymentId || actuallyPaid <= 0) {
      console.error("NOWPayments webhook missing required fields", {
        orderId,
        paymentId,
        actuallyPaid,
      })
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const network = getNetworkFromCurrency(parsedBody.pay_currency)
    const confirmedAt = new Date().toISOString()
    const admin = createSupabaseAdminClient()

    const { data: existingDeposit, error: existingDepositError } = await admin
      .from("deposits")
      .select("id")
      .eq("tx_hash", paymentId)
      .maybeSingle()

    if (existingDepositError) {
      console.error("Failed to check duplicate deposit", existingDepositError)
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    if (existingDeposit) {
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const { error: insertDepositError } = await admin.from("deposits").insert({
      user_id: orderId,
      network,
      tx_hash: paymentId,
      amount_usdt: actuallyPaid,
      status: "confirmed",
      confirmed_at: confirmedAt,
    })

    if (insertDepositError) {
      console.error("Failed to insert deposit", insertDepositError)
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const { error: incrementBalanceError } = await admin.rpc("increment_balance", {
      p_user_id: orderId,
      p_amount: actuallyPaid,
    })

    if (incrementBalanceError) {
      console.error("Failed to increment balance", incrementBalanceError)
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const { error: insertEarningsError } = await admin.from("earnings").insert({
      user_id: orderId,
      amount_usdt: actuallyPaid,
      source: "deposit",
    })

    if (insertEarningsError) {
      console.error("Failed to insert earnings", insertEarningsError)
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("email, full_name")
      .eq("id", orderId)
      .maybeSingle()

    if (profileError) {
      console.error("Failed to fetch profile for deposit email", profileError)
    } else if (profile?.email) {
      try {
        await sendDepositConfirmationEmail({
          to: profile.email,
          fullName: profile.full_name,
          amountUsdt: actuallyPaid,
          txHash: paymentId,
          network,
          confirmedAt,
        })
      } catch (emailError) {
        console.error("Failed to send deposit confirmation email", emailError)
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error("Unhandled NOWPayments webhook error", error)
    return NextResponse.json({ ok: true }, { status: 200 })
  }
}
