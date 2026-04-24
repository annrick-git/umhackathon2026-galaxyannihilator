"use client"

interface SupplierItem {
  supplier: string
  item: string
  unit: string
  priceRM: number
  isBest?: boolean
}

interface SupplierComparisonCardProps {
  data: SupplierItem[] | unknown
}

export function SupplierComparisonCard({ data }: SupplierComparisonCardProps) {
  const items: SupplierItem[] = Array.isArray(data) ? data : []

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden max-w-md">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-sm font-medium text-foreground">Price Comparison</span>
        </div>
      </div>
      <div className="divide-y divide-border">
        {items.map((item, index) => (
          <div
            key={index}
            className={`p-4 flex items-center justify-between ${
              item.isBest ? "bg-primary/5" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                  item.isBest
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {item.isBest ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              <div>
                <p className="font-medium text-foreground">{item.supplier}</p>
                <p className="text-sm text-muted-foreground">{item.item} ({item.unit})</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-foreground">RM {item.priceRM.toFixed(2)}</p>
              {item.isBest && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  Best Price
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}