import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const FLASK_API = "http://localhost:5001/api/tools"

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

function readLocalInventory(): Inventory {
  try {
    const filePath = getInventoryPath()
    const data = fs.readFileSync(filePath, "utf-8")
    return JSON.parse(data)
  } catch (e) {
    console.error("Failed to read local inventory:", e)
    return { items: [] }
  }
}

async function fetchFromBackend(): Promise<Inventory> {
  try {
    const res = await fetch(`${FLASK_API}/get_all_inventory`)
    if (res.ok) {
      const data = await res.json()
      if (data.success) {
        return { items: data.data }
      }
    }
  } catch (e) {
    console.log("Backend not available, using local file")
  }
  return readLocalInventory()
}

export async function GET() {
  try {
    const inventory = await fetchFromBackend()
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
    
    // Handle bulk ops: restock/decrease
    if (body.action === "restock" && body.items) {
      for (const item of body.items) {
        await fetch(`${FLASK_API}/restock_item`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, quantity: item.quantity })
        })
      }
      return NextResponse.json({ success: true })
    }
    
    if (body.action === "decrease" && body.items) {
      for (const item of body.items) {
        await fetch(`${FLASK_API}/decrease_stock`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, quantity: item.quantity })
        })
      }
      return NextResponse.json({ success: true })
    }
    
    if (body.action === "add" && body.item) {
      await fetch(`${FLASK_API}/add_new_item`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body.item)
      })
      return NextResponse.json({ success: true })
    }
    
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
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

    // Set stock to specific value
    const response = await fetch(`${FLASK_API}/update_stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, currentStock })
    })
    const result = await response.json()

    return NextResponse.json(result)
  } catch (error) {
    console.error("Inventory PATCH error:", error)
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, quantity, action } = body as { id: string; quantity: number; action: string }

    if (!id || !quantity || !action) {
      return NextResponse.json(
        { error: "Invalid request: id, quantity, and action required" },
        { status: 400 }
      )
    }

    let result
    if (action === "increase") {
      // Add stock (restock)
      const response = await fetch(`${FLASK_API}/restock_item`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, quantity })
      })
      result = await response.json()
    } else if (action === "decrease") {
      // Remove/decrease stock
      const response = await fetch(`${FLASK_API}/decrease_stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, quantity })
      })
      result = await response.json()
    } else if (action === "set") {
      // Set to specific value
      const response = await fetch(`${FLASK_API}/update_stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, currentStock: quantity })
      })
      result = await response.json()
    } else {
      return NextResponse.json({ error: "Invalid action. Use: increase, decrease, or set" }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Inventory PUT error:", error)
    return NextResponse.json(
      { error: "Failed to update stock" },
      { status: 500 }
    )
  }
}