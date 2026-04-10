'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const withdrawalSchema = z.object({
  network: z.enum(['trc20', 'bep20']),
  walletAddress: z
    .string()
    .trim()
    .min(20, 'عنوان المحفظة يجب أن يحتوي على 20 حرفا على الأقل'),
  amount: z.number().min(5, 'الحد الأدنى للسحب هو 5 USDT'),
})

type WithdrawalRow = {
  id: string
  amount_usdt: number
  wallet_address: string
  network: 'trc20' | 'bep20'
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  processed_at: string | null
}

type AdminWithdrawalRow = WithdrawalRow & {
  user_id: string
  profile:
    | {
        full_name: string | null
        email: string | null
      }
    | {
        full_name: string | null
        email: string | null
      }[]
    | null
}

type AdminPaginationInput = {
  page?: number
  count?: number
}

function normalizePagination(input?: AdminPaginationInput) {
  const pageRaw = Number(input?.page ?? 1)
  const countRaw = Number(input?.count ?? 10)

  const page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1
  const count = Number.isFinite(countRaw)
    ? Math.max(5, Math.min(50, Math.floor(countRaw)))
    : 10

  const from = (page - 1) * count
  const to = from + count - 1

  return { page, count, from, to }
}

function mapDbErrorToArabic(message: string): string {
  if (message.includes('pending withdrawal request already exists')) {
    return 'لديك بالفعل طلب سحب معلق'
  }

  if (message.includes('insufficient balance')) {
    return 'الرصيد غير كاف لإتمام عملية السحب'
  }

  if (message.includes('withdrawal request is not pending')) {
    return 'تمت معالجة هذا الطلب بالفعل'
  }

  if (message.includes('only admins can process withdrawals')) {
    return 'غير مصرح لك بتنفيذ هذا الإجراء'
  }

  return 'حدث خطأ غير متوقع. حاول مرة أخرى'
}

export async function getMyWithdrawalData() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      success: false as const,
      error: 'يرجى تسجيل الدخول أولا',
    }
  }

  const [{ data: profile, error: profileError }, { data: withdrawals, error: withdrawalsError }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('balance_usdt, wallet_address')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('withdrawals')
        .select('id, amount_usdt, wallet_address, network, status, requested_at, processed_at')
        .eq('user_id', user.id)
        .order('requested_at', { ascending: false }),
    ])

  if (profileError || withdrawalsError) {
    return {
      success: false as const,
      error: 'تعذر تحميل بيانات السحب حاليا',
    }
  }

  const withdrawalRows = (withdrawals ?? []) as WithdrawalRow[]

  return {
    success: true as const,
    data: {
      balance: Number(profile?.balance_usdt ?? 0),
      walletAddress: profile?.wallet_address ?? '',
      hasPendingWithdrawal: withdrawalRows.some((row) => row.status === 'pending'),
      withdrawals: withdrawalRows,
    },
  }
}

export async function submitWithdrawalRequest(input: {
  network: 'trc20' | 'bep20'
  walletAddress: string
  amount: number
}) {
  const parsed = withdrawalSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.errors[0]?.message ?? 'بيانات الطلب غير صحيحة',
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      success: false as const,
      error: 'يرجى تسجيل الدخول أولا',
    }
  }

  const { network, walletAddress, amount } = parsed.data

  const { error } = await supabase.rpc('request_withdrawal', {
    p_network: network,
    p_wallet_address: walletAddress,
    p_amount: amount,
  })

  if (error) {
    return {
      success: false as const,
      error: mapDbErrorToArabic(error.message),
    }
  }

  return {
    success: true as const,
    message:
      'Your withdrawal request has been submitted. The admin will process it manually within 24 hours.',
  }
}

export async function getAdminWithdrawals(input?: AdminPaginationInput) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      success: false as const,
      error: 'يرجى تسجيل الدخول أولا',
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) {
    return {
      success: false as const,
      error: 'غير مصرح لك بعرض هذه البيانات',
    }
  }

  const { page, count, from, to } = normalizePagination(input)

  const { data, error, count: totalCount } = await supabase
    .from('withdrawals')
    .select(
      'id, user_id, amount_usdt, wallet_address, network, status, requested_at, processed_at, profile:profiles!withdrawals_user_id_fkey(full_name, email)',
      { count: 'exact' }
    )
    .order('requested_at', { ascending: false })
    .range(from, to)

  if (error) {
    return {
      success: false as const,
      error: 'تعذر تحميل طلبات السحب حاليا',
    }
  }

  const safeTotalCount = totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(safeTotalCount / count))
  const safePage = Math.min(page, totalPages)

  if (safeTotalCount > 0 && from >= safeTotalCount) {
    const fallbackFrom = (safePage - 1) * count
    const fallbackTo = fallbackFrom + count - 1

    const { data: fallbackData, error: fallbackError } = await supabase
      .from('withdrawals')
      .select(
        'id, user_id, amount_usdt, wallet_address, network, status, requested_at, processed_at, profile:profiles!withdrawals_user_id_fkey(full_name, email)'
      )
      .order('requested_at', { ascending: false })
      .range(fallbackFrom, fallbackTo)

    if (fallbackError) {
      return {
        success: false as const,
        error: 'تعذر تحميل طلبات السحب حاليا',
      }
    }

    return {
      success: true as const,
      data: (fallbackData ?? []) as AdminWithdrawalRow[],
      page: safePage,
      count,
      totalCount: safeTotalCount,
      totalPages,
    }
  }

  return {
    success: true as const,
    data: (data ?? []) as AdminWithdrawalRow[],
    page: safePage,
    count,
    totalCount: safeTotalCount,
    totalPages,
  }
}

export async function processWithdrawalRequest(input: {
  withdrawalId: string
  decision: 'approved' | 'rejected'
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      success: false as const,
      error: 'يرجى تسجيل الدخول أولا',
    }
  }

  const { error } = await supabase.rpc('process_withdrawal_request', {
    p_withdrawal_id: input.withdrawalId,
    p_decision: input.decision,
  })

  if (error) {
    return {
      success: false as const,
      error: mapDbErrorToArabic(error.message),
    }
  }

  return { success: true as const }
}
