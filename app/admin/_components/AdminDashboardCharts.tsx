"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts"

type AdminDashboardChartsProps = {
  totalUsers: number
  activeSubscriptions: number
  pendingSubscriptions: number
  pendingWithdrawals: number
  totalPaidOut: number
  totalEarnings: number
}

export function AdminDashboardCharts({
  totalUsers,
  activeSubscriptions,
  pendingSubscriptions,
  pendingWithdrawals,
  totalPaidOut,
  totalEarnings,
}: AdminDashboardChartsProps) {
  const netBalance = Math.max(0, totalEarnings - totalPaidOut)

  const financialData = [
    { key: "earnings", label: "إجمالي الأرباح", value: Number(totalEarnings.toFixed(2)) },
    { key: "paid", label: "إجمالي المسحوب", value: Number(totalPaidOut.toFixed(2)) },
    { key: "net", label: "صافي الرصيد", value: Number(netBalance.toFixed(2)) },
  ]

  const workflowData = [
    { key: "active", label: "اشتراكات نشطة", value: activeSubscriptions, fill: "#10B981" },
    { key: "pendingSubs", label: "اشتراكات معلقة", value: pendingSubscriptions, fill: "#F59E0B" },
    { key: "pendingWithdrawals", label: "سحوبات معلقة", value: pendingWithdrawals, fill: "#F97316" },
  ]

  const financialChartConfig = {
    value: {
      label: "القيمة",
      color: "#22C55E",
    },
  } satisfies ChartConfig

  const workflowChartConfig = {
    value: {
      label: "العدد",
      color: "#06B6D4",
    },
  } satisfies ChartConfig

  const barColors = ["#38BDF8", "#F43F5E", "#22C55E"]

  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <Card className="xl:col-span-3">
        <CardHeader>
          <CardTitle>التحليل المالي</CardTitle>
          <CardDescription>مقارنة بين الأرباح، السحوبات، وصافي الرصيد</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={financialChartConfig} className="h-[300px] w-full">
            <BarChart data={financialData} margin={{ top: 10, right: 12, left: 12, bottom: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="4 4" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={0}
              />
              <YAxis tickLine={false} axisLine={false} width={52} />
              <ChartTooltip
                cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {financialData.map((entry, index) => (
                  <Cell key={entry.key} fill={barColors[index % barColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>حالة الطلبات</CardTitle>
          <CardDescription>توزيع الاشتراكات والسحوبات في الوقت الحالي</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ChartContainer config={workflowChartConfig} className="mx-auto h-[260px] max-w-[320px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
              <Pie
                data={workflowData}
                dataKey="value"
                nameKey="label"
                innerRadius={55}
                outerRadius={95}
                strokeWidth={2}
              >
                {workflowData.map((entry) => (
                  <Cell key={entry.key} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>

          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
              <span>إجمالي المستخدمين</span>
              <span className="font-semibold">{totalUsers}</span>
            </div>
            {workflowData.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2"
              >
                <span className="inline-flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  />
                  {item.label}
                </span>
                <span className="font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
