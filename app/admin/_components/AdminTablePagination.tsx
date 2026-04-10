"use client"

import { useCallback, useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Props = {
  page: number
  count: number
  totalCount: number
  totalPages: number
  countOptions?: number[]
}

export function AdminTablePagination({
  page,
  count,
  totalCount,
  totalPages,
  countOptions = [5, 10, 20, 50],
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const startIndex = totalCount === 0 ? 0 : (page - 1) * count + 1
  const endIndex = Math.min(page * count, totalCount)

  const createQueryString = useCallback(
    (nextPage: number, nextCount: number) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("page", String(nextPage))
      params.set("count", String(nextCount))
      return params.toString()
    },
    [searchParams],
  )

  const goToPage = useCallback(
    (nextPage: number) => {
      const clampedPage = Math.max(1, Math.min(nextPage, totalPages))
      router.push(`${pathname}?${createQueryString(clampedPage, count)}`)
    },
    [count, createQueryString, pathname, router, totalPages],
  )

  const goToCount = useCallback(
    (nextCountValue: string) => {
      const nextCount = Number(nextCountValue)
      router.push(`${pathname}?${createQueryString(1, nextCount)}`)
    },
    [createQueryString, pathname, router],
  )

  const pageItems = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const pages = new Set<number>()
    pages.add(1)
    pages.add(totalPages)
    pages.add(page)
    pages.add(page - 1)
    pages.add(page + 1)

    return Array.from(pages)
      .filter((value) => value >= 1 && value <= totalPages)
      .sort((a, b) => a - b)
  }, [page, totalPages])

  if (totalPages <= 1 && totalCount <= count) {
    return null
  }

  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        عرض {startIndex}-{endIndex} من {totalCount}
      </p>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">لكل صفحة</span>
          <Select value={String(count)} onValueChange={goToCount}>
            <SelectTrigger className="w-[90px]">
              <SelectValue placeholder="العدد" />
            </SelectTrigger>
            <SelectContent>
              {countOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={`${pathname}?${createQueryString(Math.max(1, page - 1), count)}`}
                onClick={(event) => {
                  event.preventDefault()
                  if (page > 1) goToPage(page - 1)
                }}
                className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
              />
            </PaginationItem>

            {pageItems.map((pageNumber) => (
              <PaginationItem key={pageNumber}>
                <PaginationLink
                  href={`${pathname}?${createQueryString(pageNumber, count)}`}
                  isActive={page === pageNumber}
                  onClick={(event) => {
                    event.preventDefault()
                    goToPage(pageNumber)
                  }}
                >
                  {pageNumber}
                </PaginationLink>
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                href={`${pathname}?${createQueryString(Math.min(totalPages, page + 1), count)}`}
                onClick={(event) => {
                  event.preventDefault()
                  if (page < totalPages) goToPage(page + 1)
                }}
                className={page >= totalPages ? "pointer-events-none opacity-50" : undefined}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}
