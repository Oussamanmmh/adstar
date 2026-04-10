
import { getAdminSubscriptions } from "@/lib/actions/admin"
import { AdminSubscriptionsClient } from "../_components/AdminSubscriptionsClient"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams?:
    | {
        page?: string
        count?: string
        tab?: string
      }
    | Promise<{
        page?: string
        count?: string
        tab?: string
      }>
}

function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

export default async function AdminSubscriptionsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams)

  const page = toPositiveInt(resolvedSearchParams?.page, 1)
  const count = toPositiveInt(resolvedSearchParams?.count, 10)
  const tab =
    resolvedSearchParams?.tab === "pending" ||
    resolvedSearchParams?.tab === "active" ||
    resolvedSearchParams?.tab === "all"
      ? resolvedSearchParams.tab
      : "all"

  const result = await getAdminSubscriptions({ page, count, tab })

  return (
    <AdminSubscriptionsClient
      initialSubscriptions={result.success ? result.data : []}
      fetchError={result.success ? undefined : result.error}
      tab={result.success ? result.tab : tab}
      page={result.success ? result.page : page}
      count={result.success ? result.count : count}
      totalCount={result.success ? result.totalCount : 0}
      totalPages={result.success ? result.totalPages : 1}
      pendingCount={result.success ? result.pendingCount : 0}
      activeCount={result.success ? result.activeCount : 0}
      allCount={result.success ? result.allCount : 0}
    />
  )
}