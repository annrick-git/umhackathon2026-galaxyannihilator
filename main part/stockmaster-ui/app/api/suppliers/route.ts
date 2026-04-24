import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

interface SupplierItem {
  name: string
  unit: string
  priceRM: number
}

interface Supplier {
  name: string
  items: SupplierItem[]
}

interface SuppliersData {
  suppliers: Supplier[]
}

function getSuppliersPath(): string {
  return path.join(process.cwd(), "data", "suppliers.json")
}

function readSuppliers(): SuppliersData {
  const filePath = getSuppliersPath()
  const data = fs.readFileSync(filePath, "utf-8")
  return JSON.parse(data)
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const item = searchParams.get("item")

    const suppliersData = readSuppliers()

    if (item) {
      const itemLower = item.toLowerCase()
      const comparisons: { supplier: string; item: string; unit: string; priceRM: number }[] = []

      for (const supplier of suppliersData.suppliers) {
        for (const supplierItem of supplier.items) {
          if (supplierItem.name.toLowerCase().includes(itemLower)) {
            comparisons.push({
              supplier: supplier.name,
              item: supplierItem.name,
              unit: supplierItem.unit,
              priceRM: supplierItem.priceRM,
            })
          }
        }
      }

      comparisons.sort((a, b) => a.priceRM - b.priceRM)

      return NextResponse.json({ item, comparisons })
    }

    return NextResponse.json(suppliersData)
  } catch (error) {
    console.error("Suppliers API error:", error)
    return NextResponse.json(
      { error: "Failed to read suppliers" },
      { status: 500 }
    )
  }
}