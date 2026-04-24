import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

interface InventoryItem {
  id: string
  name: string
  category: string
  currentStock: number
  minStock: number
  unit: string
}

interface Inventory {
  items: InventoryItem[]
}

function getInventoryPath(): string {
  return path.join(process.cwd(), "data", "inventory.json")
}

function readInventory(): Inventory {
  const filePath = getInventoryPath()
  const data = fs.readFileSync(filePath, "utf-8")
  return JSON.parse(data)
}

function writeInventory(inventory: Inventory): void {
  const filePath = getInventoryPath()
  fs.writeFileSync(filePath, JSON.stringify(inventory, null, 2))
}

export async function GET() {
  try {
    const inventory = readInventory()
    return NextResponse.json(inventory)
  } catch (error) {
    console.error("Inventory GET error:", error)
    return NextResponse.json(
      { error: "Failed to read inventory" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { items } = body as { items: InventoryItem[] }

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Invalid request: items array required" },
        { status: 400 }
      )
    }

    const inventory: Inventory = { items }
    writeInventory(inventory)

    return NextResponse.json({ success: true, items })
  } catch (error) {
    console.error("Inventory POST error:", error)
    return NextResponse.json(
      { error: "Failed to update inventory" },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, currentStock } = body as { id: string; currentStock: number }

    if (!id || currentStock === undefined) {
      return NextResponse.json(
        { error: "Invalid request: id and currentStock required" },
        { status: 400 }
      )
    }

    const inventory = readInventory()
    const itemIndex = inventory.items.findIndex((item) => item.id === id)

    if (itemIndex === -1) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    inventory.items[itemIndex].currentStock = currentStock
    writeInventory(inventory)

    return NextResponse.json({ success: true, item: inventory.items[itemIndex] })
  } catch (error) {
    console.error("Inventory PATCH error:", error)
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    )
  }
}