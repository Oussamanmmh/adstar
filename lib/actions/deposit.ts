'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { verifyTRC20Transaction, verifyBEP20Transaction } from '@/lib/verify-deposit'
import { sendDepositConfirmationEmail } from '@/lib/email/send-deposit-confirmation'
import type { SubmitDepositResult } from '@/lib/types'

const depositSchema = z.object({
  txHash:  z.string().min(10, 'رمز المعاملة قصير جداً').max(128, 'رمز المعاملة طويل جداً'),
  network: z.enum(['trc20', 'bep20']),
})

function isLikelyTrc20TxHash(txHash: string): boolean {
  return /^[A-Fa-f0-9]{64}$/.test(txHash)
}

function isLikelyBep20TxHash(txHash: string): boolean {
  return /^0x[A-Fa-f0-9]{64}$/.test(txHash)
}

function normalizeTxHash(txHash: string, network: 'trc20' | 'bep20'): string {
  const trimmed = txHash.trim()
  return network === 'bep20' ? trimmed.toLowerCase() : trimmed
}

export async function submitDeposit(
  formData: FormData
): Promise<SubmitDepositResult> {
  // ── 1. Validate input ───────────────────────────────────────────────────────
  const parse = depositSchema.safeParse({
    txHash:  formData.get('txHash'),
    network: formData.get('network'),
  })

  if (!parse.success) {
    return { success: false, error: parse.error.errors[0].message }
  }

  const { txHash, network } = parse.data
  const cleanHash = normalizeTxHash(txHash, network)

  if (network === 'trc20' && !isLikelyTrc20TxHash(cleanHash)) {
    return { success: false, error: 'صيغة TxID الخاصة بشبكة TRC20 غير صحيحة' }
  }

  if (network === 'bep20' && !isLikelyBep20TxHash(cleanHash)) {
    return { success: false, error: 'صيغة Tx Hash الخاصة بشبكة BEP20 غير صحيحة' }
  }

  // ── 2. Authenticate ─────────────────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }

  // ── 3. Prevent duplicate tx_hash ────────────────────────────────────────────
  const { data: existing } = await supabase
    .from('deposits')
    .select('id')
    .eq('tx_hash', cleanHash)
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'تم استخدام رمز المعاملة هذا مسبقاً' }
  }

  // ── 4. Verify on-chain ──────────────────────────────────────────────────────
  let verification

  if (network === 'trc20') {
    const adminWallet = process.env.ADMIN_TRC20_WALLET
    if (!adminWallet) {
      console.error('ADMIN_TRC20_WALLET env var not set')
      return { success: false, error: 'خطأ في إعدادات الخادم. تواصل مع الدعم' }
    }
    verification = await verifyTRC20Transaction(cleanHash, adminWallet)
  } else {
    const adminWallet = process.env.ADMIN_BEP20_WALLET
    if (!adminWallet) {
      console.error('ADMIN_BEP20_WALLET env var not set')
      return { success: false, error: 'خطأ في إعدادات الخادم. تواصل مع الدعم' }
    }
    verification = await verifyBEP20Transaction(cleanHash, adminWallet)
  }

  if (!verification.success || !verification.amount) {
    return { success: false, error: verification.error ?? 'فشل التحقق من المعاملة' }
  }

  // Never round up credited value; truncate to 2 decimals to match DB precision.
  const amount = Math.floor(verification.amount * 100) / 100

  // ── 5. Record deposit (unique constraint on tx_hash guards race conditions) ─
  const { error: insertErr } = await supabase.from('deposits').insert({
    user_id:      user.id,
    network,
    tx_hash:      cleanHash,
    amount_usdt:  amount,
    status:       'confirmed',
    confirmed_at: new Date().toISOString(),
  })

  if (insertErr) {
    // 23505 = unique_violation → tx_hash already claimed by a concurrent request
    if (insertErr.code === '23505') {
      return { success: false, error: 'تم استخدام رمز المعاملة هذا مسبقاً' }
    }
    console.error('[deposit] insert error:', insertErr)
    return { success: false, error: 'فشل تسجيل الإيداع. يرجى التواصل مع الدعم' }
  }

  // ── 6. Atomically increment balance ────────────────────────────────────────
  const { error: balErr } = await supabase.rpc('increment_balance', {
    p_user_id: user.id,
    p_amount:  amount,
  })

  if (balErr) {
    console.error('[deposit] increment_balance error:', balErr)
    // Deposit row is already recorded; admin can reconcile manually.
    return {
      success: false,
      error: 'تم تسجيل الإيداع لكن فشل تحديث الرصيد. تواصل مع الدعم وسيتم حل المشكلة',
    }
  }

  // ── 7. Earnings history record ─────────────────────────────────────────────
  await supabase.from('earnings').insert({
    user_id:     user.id,
    amount_usdt: amount,
    source:      'deposit',
  })

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .maybeSingle()

  const recipientEmail = profile?.email ?? user.email

  if (recipientEmail) {
    try {
      await sendDepositConfirmationEmail({
        to: recipientEmail,
        fullName: profile?.full_name,
        amountUsdt: amount,
        txHash: cleanHash,
        network,
        confirmedAt: new Date().toISOString(),
      })
    } catch (emailError) {
      console.error('[deposit] failed to send confirmation email:', emailError)
    }
  }

  return { success: true, amount }
}