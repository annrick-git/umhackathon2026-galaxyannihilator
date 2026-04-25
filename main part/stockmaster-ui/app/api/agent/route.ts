import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const ZAI_API_KEY = process.env.ZAI_API_KEY || ""
const ZAI_BASE_URL = process.env.ZAI_BASE_URL || "https://api.ilmu.ai/v1"
const ZAI_MODEL = process.env.ZAI_MODEL || "ilmu-glm-5.1"
const FLASK_API = "http://localhost:5001/api/tools"

const TOOL_SCHEMAS = [
  {
    type: "function",
    function: {
      name: "get_optimal_supplier",
      description: "Find the best/cheapest supplier for an item by normalizing price to per-unit basis",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "The name of the item to compare suppliers for" }
        },
        required: ["name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_low_stock_items",
      description: "Get all items that are below their minimum stock threshold",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_stock_summary",
      description: "Get overall inventory statistics",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "restock_item",
      description: "Add stock to an item",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "The item ID to restock" },
          quantity: { type: "number", description: "Quantity to add" }
        },
        required: ["id", "quantity"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_all_inventory",
      description: "Get all inventory items",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_recommended_restock",
      description: "Get AI-powered restocking recommendations",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_order_draft",
      description: "Generate a WhatsApp order message",
      parameters: {
        type: "object",
        properties: {
          supplier: { type: "string" },
          items: { type: "array" },
          format: { type: "string" }
        },
        required: ["items"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_stock",
      description: "Delete/clear all stock for an item (set to 0). Use when user wants to remove or waste stock.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "The item ID to delete stock for" }
        },
        required: ["id"]
      }
    }
  }
]

const READ_TOOLS = ["get_all_inventory", "get_low_stock_items", "get_stock_summary", "get_optimal_supplier", "get_recommended_restock"]
const WRITE_TOOLS = ["restock_item", "generate_order_draft", "delete_stock"]

async function executeTool(toolName: string, args: Record<string, unknown> = {}) {
  const url = `${FLASK_API}/${toolName}`
  
  try {
    if (READ_TOOLS.includes(toolName)) {
      const response = await fetch(url + (Object.keys(args).length > 0 ? "?" + new URLSearchParams(args as Record<string, string>).toString() : ""), {
        method: "GET"
      })
      return await response.json()
    } else if (toolName === "restock_item") {
      // restock_item needs POST with JSON body
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args)
      })
      return await response.json()
    } else {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args)
      })
      return await response.json()
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

function formatToolResult(toolName: string, result: Record<string, unknown>) {
  if (!result.success && !result.data) return `Sorry, I got an error: ${result.error || "Unknown error"}`
  
  if (toolName === "get_all_inventory") {
    const items = (result.data || []) as { id: string; name: string; category: string; currentStock: number; minStock: number; unit: string }[]
    if (items.length === 0) return "No items in inventory."
    
    let response = `📦 **All Inventory (${items.length} items):**\n\n`
    items.forEach(i => {
      const status = i.currentStock < i.minStock ? "⚠️ LOW" : "✅"
      response += `• ${i.name}: ${i.currentStock}/${i.minStock} ${i.unit} ${status}\n`
    })
    return response
  }
  
  if (toolName === "get_optimal_supplier") {
    const best = result.best_supplier
    const price = result.best_price_rm
    const unit = result.best_unit
    const normPrice = result.normalized_price
    const normUnit = result.normalized_unit
    const savings = result.potential_savings
    const options = result.all_options_count
    
    let response = `I've checked all ${options} suppliers for you!\n\n`
    response += `🏆 **Best Price: ${best}**\n`
    response += `   RM${price} (${unit})\n`
    response += `   = RM${normPrice}/${normUnit}\n`
    
    if (savings && typeof savings === 'number' && savings > 0) {
      response += `\n💰 **You save RM${savings}** by choosing ${best}!`
    }
    
    return response
  }
  
  if (toolName === "get_low_stock_items") {
    const items = (result.data || []) as { name: string; currentStock: number; minStock: number; unit: string }[]
    if (items.length === 0) return "Great news boss! All items are well stocked! ✨"
    
    let response = `⚠️ **${items.length} items need restocking:**\n\n`
    items.slice(0, 5).forEach((i) => {
      const status = i.currentStock === 0 ? "OUT OF STOCK!" : "low"
      response += `• **${i.name}**: ${i.currentStock}/${i.minStock} ${i.unit} (${status})\n`
    })
    if (items.length > 5) {
      response += `\n...and ${items.length - 5} more items`
    }
    return response
  }
  
  if (toolName === "get_stock_summary") {
    const d = (result.data as Record<string, unknown>) || {}
    const health = d.stock_health_percentage
    const total = d.total_unique_items
    const low = d.low_stock_items
    const out = d.out_of_stock_items
    
    let response = `📊 **Inventory Summary**\n\n`
    response += `✅ System Health: **${health}%**\n`
    response += `📦 Total Items: ${total}\n`
    response += `⚠️ Low Stock: ${low}\n`
    response += `🔴 Out of Stock: ${out}`
    
    return response
  }
  
  if (toolName === "get_recommended_restock") {
    const items = (result.data || []) as { name: string; recommended_order_quantity: number; unit: string; priority: string; estimated_cost_rm: number }[]
    if (items.length === 0) return "Everything looks good boss! No restocking needed."
    
    let response = `📋 **Recommended Restock:**\n\n`
    items.slice(0, 5).forEach((i) => {
      response += `• **${i.name}**: Order ${i.recommended_order_quantity} ${i.unit}\n`
      response += `   Priority: ${i.priority} | Est. RM${i.estimated_cost_rm}\n`
    })
    
    const totalCost = result.total_estimated_cost_rm
    response += `\n💵 **Total Estimated: RM${totalCost}**`
    
    return response
  }
  
  if (toolName === "restock_item") {
    const item = (result.data as { name: string; unit: string }) || {}
    const newStock = result.new_stock as number
    const added = result.added_quantity as number
    
    const fs = require("fs")
    let pricePerUnit = 0
    try {
      const suppliersData = JSON.parse(fs.readFileSync("./data/suppliers.json", "utf8"))
      for (const supplier of suppliersData.suppliers) {
        const found = supplier.items.find((i: { name: string }) => i.name.toLowerCase() === item.name.toLowerCase())
        if (found) {
          pricePerUnit = found.priceRM
          break
        }
      }
    } catch {}
    
    const totalCost = added * pricePerUnit
    
    let billing = pricePerUnit > 0 
      ? `\n\n💵 BILLING\n───────\nUnit: RM${pricePerUnit.toFixed(2)}\nTotal: RM${totalCost.toFixed(2)}`
      : ""
    
    return `✅ Restock: ${item.name}\n+${added} ${item.unit}\nNew: ${newStock}${billing}`
  }
  
  if (toolName === "generate_order_draft") {
    const msg = result.message as string
    const total = result.total_rm as number
    return `📱 **WhatsApp Order Message:**\n\n_${msg}_\n\n💰 **Total: RM${total}**\n\nCopy and send to supplier!`
  }
  
  return JSON.stringify(result, null, 2).slice(0, 500)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, conversationHistory = [] } = body

    const client = new OpenAI({
      apiKey: ZAI_API_KEY,
      baseURL: ZAI_BASE_URL,
    })

    const systemPrompt = `You are StockMaster AI, a friendly inventory assistant for a milk tea shop.

Your personality: Helpful, casual, like talking to a friend. You use simple language.

CRITICAL: When you need to get or update inventory data, you MUST use the provided tools by responding with a function call in the correct JSON format. Do NOT write tool names as text - actually call the function.
DO NOT write <tool_call> or </tool_call> tags in your responses - these are for internal use only.

IMPORTANT TOOLS AVAILABLE:
- get_all_inventory: Check all items (no arguments needed)
- get_low_stock_items: See what's low/out (no arguments needed)
- get_stock_summary: Overall stats (no arguments needed)
- get_optimal_supplier: Find cheapest supplier (needs item name as {"name": "item"})
- restock_item: Add stock (needs {"id": "item_id", "quantity": number})
- get_recommended_restock: AI suggestions (no arguments needed)

RULES:
1. When the user asks about stock, ALWAYS call the appropriate tool first
2. Do NOT just describe what tool you would use - actually call it
3. Format response nicely with emojis after you get the data
4. Use Markdown for bold (**text**) and bullets (•)

If user wants to restock, call restock_item tool with the item id and quantity.
If user wants to see what's low, call get_low_stock_items.
If user wants recommendations, call get_recommended_restock.

NEVER write <tool_call>... as text. Use the function calling format.`

    // PRE-PROCESS: Handle restock requests BEFORE calling LLM
    const lower = message.toLowerCase()
    if (lower.includes("restock") || lower.includes("order more") || lower.includes("bawak") || lower.includes("bawa")) {
      const itemMatch = message.match(/(?:restock|order|bawak|bawa)\s+(?:the\s+)?(.+?)(?:\s+(\d+)|$)/i)
      
      if (itemMatch && itemMatch[1]) {
        const itemName = itemMatch[1].trim()
        const invResult = await executeTool("get_all_inventory", {})
        const items = (invResult.data || []) as { id: string; name: string; currentStock: number; minStock: number; unit: string }[]
        const foundItem = items.find(i => i.name.toLowerCase().includes(itemName.toLowerCase()))
        
        if (foundItem) {
          const qtyToAdd = itemMatch[2] ? parseInt(itemMatch[2]) : foundItem.minStock - foundItem.currentStock + 10
          const restockResult = await executeTool("restock_item", { id: foundItem.id, quantity: qtyToAdd })
          return NextResponse.json({ response: formatToolResult("restock_item", restockResult) })
        }
      }
    }

    // PRE-PROCESS: Handle delete/clear/remove stock requests
    if (lower.includes("delete") || lower.includes("clear") || lower.includes("remove") || lower.includes("waste")) {
      const itemMatch = message.match(/(?:delete|clear|remove|waste)\s+(?:the\s+)?(.+?)(?:\s+(\d+)|$)/i)
      
      if (itemMatch && itemMatch[1]) {
        const itemName = itemMatch[1].trim()
        const invResult = await executeTool("get_all_inventory", {})
        const items = (invResult.data || []) as { id: string; name: string; currentStock: number; minStock: number; unit: string }[]
        const foundItem = items.find(i => i.name.toLowerCase().includes(itemName.toLowerCase()))
        
        if (foundItem) {
          const deleteResult = await executeTool("delete_stock", { id: foundItem.id })
          if (deleteResult.success) {
            const prevStock = deleteResult.previous_stock as number
            return NextResponse.json({ response: `🗑️ Cleared ${foundItem.name}\nPrev: ${prevStock} ${foundItem.unit}\nNow: 0` })
          }
          return NextResponse.json({ response: `Sorry, couldn't clear stock: ${deleteResult.error}` })
        }
        return NextResponse.json({ response: `Couldn't find item: "${itemName}"` })
      }
    }

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...conversationHistory.map((msg: Record<string, string>) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user" as const, content: message },
    ]

    const completion = await client.chat.completions.create({
      model: ZAI_MODEL,
      messages: messages as never,
      tools: TOOL_SCHEMAS as never,
      temperature: 0.7,
    })

    const response = completion.choices[0]?.message
    console.log("Z AI response:", response)

    if (response?.tool_calls) {
      const toolCall = response.tool_calls[0]
      if (!('function' in toolCall)) {
        return NextResponse.json({ response: "Unable to process tool call" })
      }
      const toolName = toolCall.function.name
      const args = JSON.parse(toolCall.function.arguments)

      console.log(`[Tool] ${toolName}:`, args)

      const toolResult = await executeTool(toolName, args)
      return NextResponse.json({ response: formatToolResult(toolName, toolResult) })
    }

    const textResponse = response?.content || ""
    
    // Parse tool calls from text format: <tool_call>restock_item({"id": "5", "quantity": 5})</tool_call>
    const toolCallPatternWithArgs = /<tool_call>(\w+)\(\s*(\{[^}]+\})\s*\)<\/tool_call>/
    const toolMatchWithArgs = textResponse.match(toolCallPatternWithArgs)
    
    // Also parse simple pattern: <tool_call>get_recommended_restock</tool_call>
    const simplePattern = /<tool_call>(\w+)<\/tool_call>/
    const simpleMatch = textResponse.match(simplePattern)
    
    // Handle tool call with arguments first
    if (toolMatchWithArgs) {
      const toolName = toolMatchWithArgs[1]
      const argsStr = toolMatchWithArgs[2]
      console.log("Detected tool call with args:", toolName, argsStr)
      
      try {
        const args = JSON.parse(argsStr)
        const toolResult = await executeTool(toolName, args)
        return NextResponse.json({ response: formatToolResult(toolName, toolResult) })
      } catch (e) {
        console.error("Failed to parse tool call:", e)
      }
    }
    
    // Handle simple tool call (no arguments)
    if (simpleMatch) {
      const toolName = simpleMatch[1]
      console.log("Detected simple tool call:", toolName)
      
      if (toolName === "get_recommended_restock" || toolName === "get_low_stock_items") {
        const toolResult = await executeTool("get_recommended_restock", {})
        return NextResponse.json({ response: formatToolResult("get_recommended_restock", toolResult) })
      }
      if (toolName === "get_all_inventory") {
        const toolResult = await executeTool("get_all_inventory", {})
        return NextResponse.json({ response: formatToolResult("get_all_inventory", toolResult) })
      }
      if (toolName === "get_stock_summary") {
        const toolResult = await executeTool("get_stock_summary", {})
        return NextResponse.json({ response: formatToolResult("get_stock_summary", toolResult) })
      }
if (toolName === "get_low_stock_items") {
        const toolResult = await executeTool("get_low_stock_items", {})
        return NextResponse.json({ response: formatToolResult("get_low_stock_items", toolResult) })
      }
    }

    return NextResponse.json({ response: textResponse || "Sure boss! What would you like to know?" })
  } catch (error) {
    console.error("Agent API error:", error)
    return NextResponse.json(
      { error: "Agent error", details: String(error) },
      { status: 500 }
    )
  }
}