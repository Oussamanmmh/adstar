"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import {
  getMyWithdrawalData,
  submitWithdrawalRequest,
} from "@/lib/actions/withdrawals"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Copy,
  Loader2,
  Wallet,
  XCircle,
} from "lucide-react"

type WithdrawalNetwork = "trc20" | "bep20"

type WithdrawalStatus = "pending" | "approved" | "rejected"

type MyWithdrawal = {
  id: string
  amount_usdt: number
  wallet_address: string
  network: WithdrawalNetwork
  status: WithdrawalStatus
  requested_at: string
  processed_at: string | null
}

const MIN_WITHDRAWAL = 5

const NETWORK_OPTIONS: Array<{
  value: WithdrawalNetwork
  label: string
  image: string
}> = [
  {
    value: "trc20",
    label: "USDT TRC20",
    image: "/assets/USDT-TRC20.png",
  },
  {
    value: "bep20",
    label: "USDT BEP20",
    image: "/assets/USDT-BEP20.png",
  },
]

function truncateWalletAddress(address: string): string {
  if (address.length <= 14) return address
  return `${address.slice(0, 8)}...${address.slice(-6)}`
}

function networkLabel(network: WithdrawalNetwork): string {
  return network === "trc20" ? "TRC20" : "BEP20"
}

function statusBadge(status: WithdrawalStatus) {
  if (status === "pending") {
    return (
      <Badge variant="outline" className="border-yellow-500 text-yellow-500">
        <Clock className="mr-1 h-3 w-3" />
        معلق
      </Badge>
    )
  }

  if (status === "approved") {
    return (
      <Badge variant="outline" className="border-green-500 text-green-500">
        <CheckCircle className="mr-1 h-3 w-3" />
        مقبول
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="border-red-500 text-red-500">
      <XCircle className="mr-1 h-3 w-3" />
      مرفوض
    </Badge>
  )
}

export default function WithdrawPage() {
  const { user, refreshUser } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [balance, setBalance] = useState(0)
  const [walletAddress, setWalletAddress] = useState("")
  const [network, setNetwork] = useState<WithdrawalNetwork>("trc20")
  const [amount, setAmount] = useState("")
  const [hasPendingWithdrawal, setHasPendingWithdrawal] = useState(false)
  const [withdrawals, setWithdrawals] = useState<MyWithdrawal[]>([])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    const result = await getMyWithdrawalData()

    if (!result.success) {
      toast.error(result.error)
      setIsLoading(false)
      return
    }

    setBalance(result.data.balance)
    setHasPendingWithdrawal(result.data.hasPendingWithdrawal)
    setWithdrawals(result.data.withdrawals)
    setWalletAddress((current) => current || result.data.walletAddress)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const numericAmount = Number(amount)
  const isAmountInvalid =
    !amount || Number.isNaN(numericAmount) || numericAmount < MIN_WITHDRAWAL || numericAmount > balance
  const isWalletInvalid = walletAddress.trim().length < 20
  const isFormInvalid = isAmountInvalid || isWalletInvalid || hasPendingWithdrawal || isSubmitting

  const selectedNetworkOption = useMemo(
    () => NETWORK_OPTIONS.find((item) => item.value === network) ?? NETWORK_OPTIONS[0],
    [network]
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (hasPendingWithdrawal) {
      toast.error("لديك بالفعل طلب سحب معلق")
      return
    }

    if (numericAmount < MIN_WITHDRAWAL) {
      toast.error(`الحد الأدنى للسحب هو ${MIN_WITHDRAWAL} USDT`)
      return
    }

    if (numericAmount > balance) {
      toast.error("المبلغ المطلوب أكبر من رصيدك المتاح")
      return
    }

    if (walletAddress.trim().length < 20) {
      toast.error("يرجى إدخال عنوان محفظة صحيح")
      return
    }

    setIsSubmitting(true)

    const result = await submitWithdrawalRequest({
      network,
      walletAddress: walletAddress.trim(),
      amount: numericAmount,
    })

    if (!result.success) {
      toast.error(result.error)
      setIsSubmitting(false)
      return
    }

    toast.success("تم إرسال طلب السحب بنجاح", {
      description: result.message,
    })

    setAmount("")
    await Promise.all([loadData(), refreshUser()])
    setIsSubmitting(false)
  }

  function copyToClipboard(value: string) {
    navigator.clipboard.writeText(value)
    toast.success("تم نسخ العنوان")
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        العودة إلى اللوحة
      </Link>

      <div>
        <h1 className="text-2xl font-bold md:text-3xl">سحب الأرباح</h1>
        <p className="text-muted-foreground">إدارة طلبات السحب على شبكتي TRC20 و BEP20</p>
      </div>

      <Card className="border-primary/20 bg-linear-to-br from-primary/10 to-background">
        <CardContent className="py-6 text-center">
          {isLoading ? (
            <div className="mx-auto w-48 space-y-2">
              <Skeleton className="mx-auto h-4 w-24" />
              <Skeleton className="mx-auto h-10 w-40" />
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">الرصيد المتاح للسحب</p>
              <p className="text-4xl font-extrabold text-primary">${balance.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">USDT</p>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              طلب سحب جديد
            </CardTitle>
            <CardDescription>الحد الأدنى للسحب هو 5 USDT. سيتم تنفيذ التحويل يدويا من قبل الإدارة.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                {hasPendingWithdrawal && (
                  <div className="mb-4 flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
                    <AlertCircle className="mt-0.5 h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="font-medium">لديك طلب سحب معلق</p>
                      <p className="text-sm text-muted-foreground">لا يمكنك إرسال طلب جديد حتى تتم معالجة الطلب الحالي.</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Field>
                    <FieldLabel htmlFor="network">الشبكة</FieldLabel>
                    <Select
                      value={network}
                      onValueChange={(value) => setNetwork(value as WithdrawalNetwork)}
                    >
                      <SelectTrigger id="network" className="w-full">
                        <SelectValue>
                          <span className="flex items-center gap-2">
                            <Image
                              src={selectedNetworkOption.image}
                              alt={selectedNetworkOption.label}
                              width={20}
                              height={20}
                            />
                            {selectedNetworkOption.label}
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {NETWORK_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className="flex items-center gap-2">
                              <Image src={option.image} alt={option.label} width={20} height={20} />
                              {option.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="wallet-address">عنوان المحفظة</FieldLabel>
                    <Input
                      id="wallet-address"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      placeholder="ألصق عنوان محفظتك"
                      minLength={20}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="amount">المبلغ (USDT)</FieldLabel>
                    <Input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min={MIN_WITHDRAWAL}
                      max={balance}
                      step="0.01"
                      placeholder="5"
                    />
                  </Field>

                  <Button type="submit" className="w-full text-white" disabled={isFormInvalid}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        جار إرسال الطلب...
                      </>
                    ) : (
                      "أرسل طلب السحب"
                    )}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>سجل السحوبات</CardTitle>
            <CardDescription>جميع طلبات السحب الخاصة بحسابك</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : withdrawals.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">لا يوجد لديك أي طلبات سحب حتى الآن</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الشبكة</TableHead>
                      <TableHead>المحفظة</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.map((withdrawal) => (
                      <TableRow key={withdrawal.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(withdrawal.requested_at).toLocaleDateString("ar-EG")}
                        </TableCell>
                        <TableCell>{networkLabel(withdrawal.network)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">
                              {truncateWalletAddress(withdrawal.wallet_address)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(withdrawal.wallet_address)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-primary">
                          ${Number(withdrawal.amount_usdt).toFixed(2)}
                        </TableCell>
                        <TableCell>{statusBadge(withdrawal.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
