
import { getAdminPackages } from "@/lib/actions/admin"
import { AdminPackagesClient } from "../_components/AdminPackagesClient"

export const dynamic = "force-dynamic" // always fresh data

type PageProps = {
  searchParams?:
    | {
        page?: string
        count?: string
      }
    | Promise<{
        page?: string
        count?: string
      }>
}

function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

export default async function AdminPackagesPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams)
  const page = toPositiveInt(resolvedSearchParams?.page, 1)
  const count = toPositiveInt(resolvedSearchParams?.count, 10)
  const result = await getAdminPackages({ page, count })

  // Pass initial data down — client component never needs to fetch on mount
  return (
    <AdminPackagesClient
      initialPackages={result.success ? result.data : []}
      fetchError={result.success ? undefined : result.error}
      page={result.success ? result.page : page}
      count={result.success ? result.count : count}
      totalCount={result.success ? result.totalCount : 0}
      totalPages={result.success ? result.totalPages : 1}
    />
  )
}