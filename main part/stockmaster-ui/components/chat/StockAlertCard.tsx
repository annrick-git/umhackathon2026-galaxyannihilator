"use client"

interface StockItem {
  name: string
  currentStock: number
  minStock: number
  status: "critical" | "low" | "ok"
  unit?: string
}

interface StockAlertCardProps {
  data: StockItem[] | unknown
}

function getStatusColor(status: string) {
  switch (status) {
    case "critical":
      return "bg-destructive/10 text-destructive"
    case "low":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
    default:
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "critical":
      return "Critical"
    case "low":
      return "Low"
    default:
      return "OK"
  }
}

export function StockAlertCard({ data }: StockAlertCardProps) {
  const items: StockItem[] = Array.isArray(data) ? data : []

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden max-w-md">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm font-medium text-foreground">Stock Alert</span>
        </div>
      </div>
      <div className="divide-y divide-border">
        {items.map((item, index) => (
          <div key={index} className="p-4 flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium text-foreground">{item.name}</p>
              <p className="text-sm text-muted-foreground">
                {item.currentStock} / {item.minStock} {item.unit || "units"}
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
              {getStatusLabel(item.status)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}