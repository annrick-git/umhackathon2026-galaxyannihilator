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
    let mounted = true
    
    const fetchStats = async () => {
      if (!mounted) return
      
      try {
        const resStats = await fetch("http://localhost:5001/api/tools/get_stock_summary")
        if (resStats.ok) {
          const dataStats = await resStats.json()
          if (dataStats.success && mounted) {
            setStats(dataStats.data)
          }
        }
      } catch {
        // Backend not running - ignore
      }
    }

    const fetchValue = async () => {
      if (!mounted) return
      
      try {
        const resVal = await fetch("http://localhost:5001/api/tools/get_inventory_valuation")
        if (resVal.ok) {
          const dataVal = await resVal.json()
          if (dataVal.success && mounted) {
            setValue(dataVal.total_inventory_value_rm)
          }
        }
      } catch {
        // Backend not running - ignore
      }
      
      if (mounted) setIsLoading(false)
    }

    fetchStats()
    fetchValue()
    
    const interval = setInterval(() => { fetchStats(); fetchValue() }, 5000)
    return () => { mounted = false; clearInterval(interval) }
  }, [])

  if (isLoading) {
    return <div className="sticky top-0 z-50 bg-background/95 backdrop-blur py-4 border-b border-border mb-4">
      <div className="h-24 w-full animate-pulse bg-card rounded-xl border border-border"></div>
    </div>
  }

  const defaultStats = {
    total_unique_items: 0,
    low_stock_items: 0,
    out_of_stock_items: 0,
    well_stocked_items: 0,
    total_current_stock_units: 0,
    stock_health_percentage: 0
  }

  const displayStats = stats || defaultStats

  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur py-4 border-b border-border mb-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
            <Package className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">System Health</p>
            <h3 className="text-2xl font-bold text-foreground">{displayStats.stock_health_percentage}%</h3>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Critical Items</p>
            <h3 className="text-2xl font-bold text-foreground">{displayStats.low_stock_items + displayStats.out_of_stock_items}</h3>
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
    </div>
  )
}
