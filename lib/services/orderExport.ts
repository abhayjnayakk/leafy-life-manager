import * as XLSX from "xlsx"
import type { Order } from "@/lib/db/schema"
import { supabase } from "@/lib/supabase/client"

// ============================================================
// Order → Excel Export (Admin only)
// ============================================================

interface FlatOrderRow {
  "Order #": string
  "Date": string
  "Type": string
  "Customer": string
  "Phone": string
  "Item": string
  "Size": string
  "Qty": number
  "Unit Price": number
  "Line Total": number
  "Subtotal": number
  "Discount": number
  "Order Total": number
  "Payment": string
  "Created By": string
}

function flattenOrders(orders: Order[]): FlatOrderRow[] {
  const rows: FlatOrderRow[] = []

  for (const order of orders) {
    for (const item of order.items) {
      rows.push({
        "Order #": order.orderNumber,
        "Date": order.date,
        "Type": order.orderType === "DineIn" ? "Dine In" : order.orderType === "Takeaway" ? "Take Away" : "Delivery",
        "Customer": order.customerName ?? "",
        "Phone": order.customerPhone ?? "",
        "Item": item.menuItemName,
        "Size": item.size,
        "Qty": item.quantity,
        "Unit Price": item.unitPrice,
        "Line Total": item.lineTotal,
        "Subtotal": order.subtotal,
        "Discount": order.discount,
        "Order Total": order.totalAmount,
        "Payment": order.paymentMethod,
        "Created By": order.createdBy ?? "",
      })
    }
  }

  return rows
}

/** Export orders for a given date as .xlsx and trigger download */
export function exportOrdersToExcel(orders: Order[], date: string) {
  if (orders.length === 0) return

  const rows = flattenOrders(orders)

  // Create workbook + sheet
  const ws = XLSX.utils.json_to_sheet(rows)

  // Auto-size columns
  const colWidths = Object.keys(rows[0] ?? {}).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...rows.map((r) => String(r[key as keyof FlatOrderRow] ?? "").length)
    )
    return { wch: Math.min(maxLen + 2, 30) }
  })
  ws["!cols"] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Orders")

  // Add summary sheet
  const totalSales = orders.reduce((s, o) => s + o.totalAmount, 0)
  const totalDiscount = orders.reduce((s, o) => s + o.discount, 0)
  const cashTotal = orders.filter((o) => o.paymentMethod === "Cash").reduce((s, o) => s + o.totalAmount, 0)
  const upiTotal = orders.filter((o) => o.paymentMethod === "UPI").reduce((s, o) => s + o.totalAmount, 0)
  const cardTotal = orders.filter((o) => o.paymentMethod === "Card").reduce((s, o) => s + o.totalAmount, 0)

  const summary = [
    { "Metric": "Date", "Value": date },
    { "Metric": "Total Orders", "Value": orders.length },
    { "Metric": "Total Sales", "Value": totalSales },
    { "Metric": "Total Discount", "Value": totalDiscount },
    { "Metric": "Cash", "Value": cashTotal },
    { "Metric": "UPI", "Value": upiTotal },
    { "Metric": "Card", "Value": cardTotal },
    { "Metric": "Avg Order Value", "Value": orders.length > 0 ? Math.round(totalSales / orders.length) : 0 },
  ]

  const summaryWs = XLSX.utils.json_to_sheet(summary)
  summaryWs["!cols"] = [{ wch: 18 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary")

  // Trigger download
  const filename = `Leafy-Orders-${date}.xlsx`
  XLSX.writeFile(wb, filename)
}

/** Fetch ALL orders for a date range and export */
export async function exportOrdersForDateRange(
  startDate: string,
  endDate: string
) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch orders: ${error.message}`)
  }

  const orders: Order[] = (data ?? []).map((row: any) => ({
    id: row.id,
    orderNumber: row.order_number,
    orderType: row.order_type,
    date: row.date,
    items: row.items ?? [],
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    totalAmount: Number(row.total_amount),
    paymentMethod: row.payment_method,
    notes: row.notes ?? undefined,
    customerName: row.customer_name ?? undefined,
    customerPhone: row.customer_phone ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
  }))

  if (orders.length === 0) return 0

  const rows = flattenOrders(orders)

  const ws = XLSX.utils.json_to_sheet(rows)
  const colWidths = Object.keys(rows[0] ?? {}).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...rows.map((r) => String(r[key as keyof FlatOrderRow] ?? "").length)
    )
    return { wch: Math.min(maxLen + 2, 30) }
  })
  ws["!cols"] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Orders")

  const filename = startDate === endDate
    ? `Leafy-Orders-${startDate}.xlsx`
    : `Leafy-Orders-${startDate}-to-${endDate}.xlsx`

  XLSX.writeFile(wb, filename)
  return orders.length
}
