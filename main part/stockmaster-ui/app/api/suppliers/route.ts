import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

interface Supplier {
  name: string
  items: { name: string; unit: string; priceRM: number }[]
}

function getSuppliersPath(): string {
  return path.join(process.cwd(), "data", "suppliers.json")
}

function getInventoryPath(): string {
  return path.join(process.cwd(), "data", "inventory.json")
}

function readSuppliers(): { suppliers: Supplier[] } {
  const filePath = getSuppliersPath()
  const data = fs.readFileSync(filePath, "utf-8")
  return JSON.parse(data)
}

function normalizePrice(price: number, unitStr: string): number {
  const numbers = unitStr.match(/[\d,]+/g)
  if (!numbers) return price
  const qty = parseFloat(numbers[numbers.length - 1].replace(/,/g ''))
  if (isNaN(qty) || qty === 0) return price
  return price / qty
}

function getBaseUnit(unitStr: string): string {
  const lower = unitStr.toLowerCase()
  if (lower.includes('liter') || lower.includes('ml') || lower.includes('gallon')) return 'liter'
  if (lower.includes('kg') || lower.includes('g') || lower.includes('gram')) return 'kg'
  return 'unit'
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const action = searchParams.get('action')
  const itemName = searchParams.get('name')

  if (action === 'optimal_supplier' && itemName) {
    try {
      const suppliersData = readSuppliers()
      const itemLower = itemName.toLowerCase()
      
      const supplierOptions = []
      for (const supplier of suppliersData.suppliers) {
        for (const supItem of supplier.items) {
          if (itemLower.includes(supItem.name.toLowerCase()) {
            const normPrice = normalizePrice(supItem.priceRM, supItem.unit)
            const baseUnit = getBaseUnit(supItem.unit)
            supplierOptions.push({
              supplier_name: supplier.name,
              item_name: supItem.name,
              unit: supItem.unit,
              price_rm: supItem.priceRM,
              normalized_price: normPrice,
              base_unit: baseUnit
            })
          }
        }
      }

      if (supplierOptions.length === 0) {
        return NextResponse.json({ error: `No suppliers found for '${itemName}'` }, { status: 404 })
      }

      supplierOptions.sort((a, b) => a.normalized_price - b.normalized_price)
      const best = supplierOptions[0]
      const savings = supplierOptions.length > 1 
        ? supplierOptions[supplierOptions.length - 1].normalized_price - best.normalized_price 
        : null

      return NextResponse.json({
        item_name: itemName,
        best_supplier: best.supplier_name,
        best_price_rm: best.price_rm,
        best_unit: best.unit,
        normalized_price: best.normalized_price,
        normalized_unit: best.base_unit,
        all_options_count: supplierOptions.length,
        all_options: supplierOptions,
        potential_savings: savings ? Math.round(savings * 100) / 100 : null
      })
    } catch (error) {
      console.error("Optimal supplier error:", error)
      return NextResponse.json({ error: "Failed to find optimal supplier" }, { status: 500 })
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}