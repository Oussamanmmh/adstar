
import { getAdminWithdrawals } from "@/lib/actions/withdrawals"
import { AdminWithdrawalsClient } from "../_components/Adminwithdrawalsclient"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams?: {
    page?: string
    count?: string
  }
}

function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

export default async function AdminWithdrawalsPage({ searchParams }: PageProps) {
  const page = toPositiveInt(searchParams?.page, 1)
  const count = toPositiveInt(searchParams?.count, 10)
  const result = await getAdminWithdrawals({ page, count })

  return (
    <AdminWithdrawalsClient
      initialWithdrawals={result.success ? result.data : []}
      fetchError={result.success ? undefined : result.error}
      page={result.success ? result.page : page}
      count={result.success ? result.count : count}
      totalCount={result.success ? result.totalCount : 0}
      totalPages={result.success ? result.totalPages : 1}
    />
  )
}