
import { getAdminUsers } from "@/lib/actions/admin"
import { AdminUsersClient } from "../_components/AdminUsersClient"

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

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const page = toPositiveInt(searchParams?.page, 1)
  const count = toPositiveInt(searchParams?.count, 10)
  const result = await getAdminUsers({ page, count })

  return (
    <AdminUsersClient
      initialUsers={result.success ? result.data : []}
      fetchError={result.success ? undefined : result.error}
      page={result.success ? result.page : page}
      count={result.success ? result.count : count}
      totalCount={result.success ? result.totalCount : 0}
      totalPages={result.success ? result.totalPages : 1}
    />
  )
}