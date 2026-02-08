"use client"

import { useState, useEffect, useMemo } from "react"
import { useSupaExpenses } from "@/lib/hooks/useSupaExpenses"
import { supabase } from "@/lib/supabase/client"
import { Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EXPENSE_CATEGORIES } from "@/lib/constants"
import { formatINR, formatPercent } from "@/lib/format"
import { useMonthlyRevenueShareStatus, useWeeklyRevenue } from "@/lib/hooks/useFinance"
import { calculateMonthlyPnL, type MonthlyPnL } from "@/lib/services/finance"
import type { Expense, ExpenseCategory } from "@/lib/db/schema"
import { toast } from "sonner"
import { format, addMonths, subMonths, parse } from "date-fns"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts"
import {
  AnimatedPage,
  StaggerGroup,
  StaggerItem,
  AnimatedNumber,
  CircularProgress,
  AnimatedCollapse,
} from "@/components/ui/animated"
import { motion } from "framer-motion"

export default function FinancePage() {
  const [addExpenseOpen, setAddExpenseOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(
    format(new Date(), "yyyy-MM")
  )
  const [pnl, setPnl] = useState<MonthlyPnL | null>(null)
  const [expensesOpen, setExpensesOpen] = useState(false)

  const revenueShare = useMonthlyRevenueShareStatus()
  const weeklyRevenue = useWeeklyRevenue()

  const { expenses: allExpenses } = useSupaExpenses()

  const monthExpenses = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number)
    const start = format(new Date(y, m - 1, 1), "yyyy-MM-dd")
    const end = format(new Date(y, m, 0), "yyyy-MM-dd")
    return (allExpenses ?? [])
      .filter((exp) => exp.date >= start && exp.date <= end)
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [allExpenses, selectedMonth])

  // Use stable signal (expense count) instead of array reference to avoid re-render loop
  const expenseCount = monthExpenses.length
  useEffect(() => {
    const [y, m] = selectedMonth.split("-").map(Number)
    calculateMonthlyPnL(y, m - 1).then(setPnl)
  }, [selectedMonth, expenseCount])

  function navigateMonth(direction: "prev" | "next") {
    const current = parse(selectedMonth, "yyyy-MM", new Date())
    const next = direction === "prev" ? subMonths(current, 1) : addMonths(current, 1)
    setSelectedMonth(format(next, "yyyy-MM"))
  }

  const displayMonth = (() => {
    const d = parse(selectedMonth, "yyyy-MM", new Date())
    return format(d, "MMMM yyyy")
  })()

  return (
    <AnimatedPage className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Finance</h1>
        <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl">
              <Plus className="h-4 w-4 mr-1" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-xl">
            <DialogHeader>
              <DialogTitle>Add Expense</DialogTitle>
            </DialogHeader>
            <AddExpenseForm onSuccess={() => setAddExpenseOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Month Picker */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => navigateMonth("prev")}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <span className="text-sm font-medium min-w-[140px] text-center">
          {displayMonth}
        </span>
        <button
          onClick={() => navigateMonth("next")}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <StaggerGroup className="space-y-5">
        {/* Revenue Total */}
        <StaggerItem>
          <div className="rounded-xl border bg-card p-5 space-y-1">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Month-to-date Revenue
            </h2>
            <AnimatedNumber
              value={revenueShare?.monthToDateRevenue ?? 0}
              formatFn={(n) => formatINR(n)}
              className="text-2xl font-bold block"
            />
            <div className="text-xs text-muted-foreground">
              Day {revenueShare?.daysElapsed ?? 0} of{" "}
              {revenueShare?.daysInMonth ?? 30} this month
            </div>
          </div>
        </StaggerItem>

        {/* Revenue Share Card with CircularProgress */}
        <StaggerItem>
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Revenue Share
              </h2>
              <CircularProgress
                value={revenueShare?.progressPercent ?? 0}
                size={40}
                strokeWidth={4}
              />
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">20% Revenue Share</span>
                <span className="font-medium">
                  {formatINR(revenueShare?.revenueShare20Pct ?? 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Minimum Guarantee</span>
                <span className="font-medium">{formatINR(18000)}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between items-center">
                <span className="font-medium">Effective Rent</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold">
                    {formatINR(revenueShare?.currentRent ?? 18000)}
                  </span>
                  <Badge variant="outline" className="text-xs rounded-lg">
                    {revenueShare?.rentType ?? "Minimum Guarantee"}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Breakeven at {formatINR(revenueShare?.breakEvenRevenue ?? 90000)}{" "}
              ({formatPercent(revenueShare?.progressPercent ?? 0)})
            </div>
          </div>
        </StaggerItem>

        {/* Weekly Revenue Chart */}
        <StaggerItem>
          <div className="rounded-xl border bg-card p-5">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Weekly Revenue
            </h2>
            {weeklyRevenue && weeklyRevenue.some((d) => d.revenue > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyRevenue}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                  />
                  <RechartsTooltip
                    formatter={(value: number) => [
                      formatINR(value),
                      "Revenue",
                    ]}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="currentColor"
                    className="fill-primary/70"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                No revenue data yet. Place some orders to see trends.
              </div>
            )}
          </div>
        </StaggerItem>

        {/* Expenses Section - Collapsible */}
        <StaggerItem>
          <div className="rounded-xl border bg-card overflow-hidden">
            <button
              onClick={() => setExpensesOpen(!expensesOpen)}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors"
            >
              <div>
                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Expenses
                </h2>
                <span className="text-lg font-bold mt-1 block">
                  {formatINR(
                    monthExpenses.reduce((s, e) => s + e.amount, 0)
                  )}
                </span>
              </div>
              <motion.div
                animate={{ rotate: expensesOpen ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </motion.div>
            </button>
            <AnimatedCollapse open={expensesOpen}>
              <div className="px-5 pb-5 space-y-2">
                {monthExpenses.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    No expenses recorded for this month
                  </div>
                ) : (
                  <>
                    {monthExpenses.map((exp) => (
                      <div
                        key={exp.id}
                        className="rounded-xl border p-3 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium text-sm">
                            {exp.description}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {exp.date} &middot; {exp.category}
                          </div>
                        </div>
                        <div className="font-bold text-sm">
                          {formatINR(exp.amount)}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </AnimatedCollapse>
          </div>
        </StaggerItem>

        {/* P&L Summary */}
        {pnl && (
          <StaggerItem>
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Profit & Loss
              </h2>

              {/* Revenue line */}
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Revenue</span>
                  <span className="font-medium text-success">
                    {formatINR(pnl.totalRevenue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Orders</span>
                  <span className="font-medium">{pnl.totalOrders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Order Value</span>
                  <span className="font-medium">
                    {formatINR(pnl.averageOrderValue)}
                  </span>
                </div>
              </div>

              {/* Expenses breakdown */}
              <div className="h-px bg-border" />
              <div className="space-y-2 text-sm">
                <ExpenseLine label="Rent / Revenue Share" amount={pnl.expenses.rent} />
                <ExpenseLine label="Electricity" amount={pnl.expenses.electricity} />
                <ExpenseLine label="Water" amount={pnl.expenses.water} />
                <ExpenseLine label="Ingredients" amount={pnl.expenses.ingredients} />
                <ExpenseLine label="Salaries" amount={pnl.expenses.salaries} />
                <ExpenseLine label="Other" amount={pnl.expenses.other} />
                <div className="h-px bg-border" />
                <div className="flex justify-between font-medium">
                  <span>Total Expenses</span>
                  <span className="text-destructive">
                    {formatINR(pnl.expenses.total)}
                  </span>
                </div>
              </div>

              {/* Profit lines */}
              <div className="h-px bg-border" />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Gross Profit</span>
                  <AnimatedNumber
                    value={pnl.grossProfit}
                    formatFn={(n) => formatINR(n)}
                    className={
                      pnl.grossProfit >= 0 ? "text-success font-medium" : "text-destructive font-medium"
                    }
                  />
                </div>
                <div className="flex justify-between text-base">
                  <span className="font-bold">Net Profit</span>
                  <AnimatedNumber
                    value={pnl.netProfit}
                    formatFn={(n) => formatINR(n)}
                    className={`font-bold ${
                      pnl.netProfit >= 0 ? "text-success" : "text-destructive"
                    }`}
                  />
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Profit Margin</span>
                  <span>{formatPercent(pnl.profitMargin)}</span>
                </div>
              </div>
            </div>
          </StaggerItem>
        )}
      </StaggerGroup>
    </AnimatedPage>
  )
}

function ExpenseLine({ label, amount }: { label: string; amount: number }) {
  if (amount === 0) return null
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{formatINR(amount)}</span>
    </div>
  )
}

function AddExpenseForm({ onSuccess }: { onSuccess: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [category, setCategory] = useState<ExpenseCategory>("Ingredients")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim() || !amount) return
    const now = new Date().toISOString()
    const { error } = await supabase.from("expenses").insert({
      date,
      category,
      description: description.trim(),
      amount: parseFloat(amount),
      is_recurring: false,
      created_at: now,
      updated_at: now,
    })
    if (error) {
      toast.error(`Failed to add expense: ${error.message}`)
      return
    }
    toast.success("Expense added")
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Date</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as ExpenseCategory)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Monthly electricity bill"
          required
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label>Amount (Rs)</Label>
        <Input
          type="number"
          min="0"
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full">
        Add Expense
      </Button>
    </form>
  )
}
