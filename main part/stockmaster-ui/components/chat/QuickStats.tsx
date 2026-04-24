"use client"

import { useMemo } from "react"

interface QuickStatsProps {
  items: { currentStock: number; minStock: number }[]
}

export function QuickStats({ items }: QuickStatsProps) {
  const stats = useMemo(() => {
    const total = items.length
    const lowStock = items.filter(i => i.currentStock < i.minStock)
    const critical = items.filter(i => i.currentStock === 0)
    const healthy = total - lowStock.length
    const healthPercent = total > 0 ? Math.round((healthy / total) * 100) : 0
    const criticalCount = critical.length
    
    return {
      healthPercent,
      lowStockCount: lowStock.length,
      criticalCount,
      healthyCount: healthy,
      totalItems: total
    }
  }, [items])

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 backdrop-blur-sm border border-emerald-500/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-emerald-400/80 uppercase tracking-wide">System Health</span>
        </div>
        <div className="text-2xl font-bold text-emerald-400">{stats.healthPercent}%</div>
        <div className="text-xs text-emerald-400/60">{stats.healthyCount}/{stats.totalItems} items</div>
      </div>

      <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 backdrop-blur-sm border border-amber-500/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-xs text-amber-400/80 uppercase tracking-wide">Low Stock</span>
        </div>
        <div className="text-2xl font-bold text-amber-400">{stats.lowStockCount}</div>
        <div className="text-xs text-amber-400/60">Need restocking</div>
      </div>

      <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 backdrop-blur-sm border border-red-500/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-xs text-red-400/80 uppercase tracking-wide">Critical</span>
        </div>
        <div className="text-2xl font-bold text-red-400">{stats.criticalCount}</div>
        <div className="text-xs text-red-400/60">Out of stock</div>
      </div>

      <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-sm border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-xs text-blue-400/80 uppercase tracking-wide">Total Items</span>
        </div>
        <div className="text-2xl font-bold text-blue-400">{stats.totalItems}</div>
        <div className="text-xs text-blue-400/60">In database</div>
      </div>
    </div>
  )
}