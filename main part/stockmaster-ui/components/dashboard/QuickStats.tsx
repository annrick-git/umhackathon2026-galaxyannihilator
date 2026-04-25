"use client"

import React, { useEffect, useState } from "react"
import { Package, AlertTriangle, DollarSign } from "lucide-react"

interface StockSummary {
  total_unique_items: number
  low_stock_items: number
  out_of_stock_items: number
  well_stocked_items: number
  total_current_stock_units: number
  stock_health_percentage: number
}

export function QuickStats() {
  const [stats, setStats] = useState<StockSummary | null>(null)
  const [value, setValue] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch from Flask backend directly
        const resStats = await fetch("http://localhost:5001/api/tools/get_stock_summary")
        const dataStats = await resStats.json()
        if (dataStats.success) {
          setStats(dataStats.data)
        }

        const resVal = await fetch("http://localhost:5001/api/tools/get_inventory_valuation")
        const dataVal = await resVal.json()
        if (dataVal.success) {
          setValue(dataVal.total_inventory_value_rm)
        }
      } catch (error) {
        console.error("Failed to fetch quick stats:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return <div className="h-24 w-full animate-pulse bg-card rounded-xl border border-border mb-6"></div>
  }

  if (!stats) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
          <Package className="w-6 h-6 text-green-500" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">System Health</p>
          <h3 className="text-2xl font-bold text-foreground">{stats.stock_health_percentage}%</h3>
        </div>
      </div>
      
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Critical Items</p>
          <h3 className="text-2xl font-bold text-foreground">{stats.low_stock_items + stats.out_of_stock_items}</h3>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
          <DollarSign className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Est. Value</p>
          <h3 className="text-2xl font-bold text-foreground">RM {value.toFixed(2)}</h3>
        </div>
      </div>
    </div>
  )
}
