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
  }
]

const READ_TOOLS = ["get_all_inventory", "get_low_stock_items", "get_stock_summary", "get_optimal_supplier", "get_recommended_restock"]
const WRITE_TOOLS = ["restock_item", "generate_order_draft"]

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
    
    if (savings && savings > 0) {
      response += `\n💰 **You save RM${savings}** by choosing ${best}!`
    }
    
    return response
  }
  
  if (toolName === "get_low_stock_items") {
    const items = result.data || []
    if (items.length === 0) return "Great news boss! All items are well stocked! ✨"
    
    let response = `⚠️ **${items.length} items need restocking:**\n\n`
    items.slice(0, 5).forEach((i: Record<string, unknown>) => {
      const status = i.currentStock === 0 ? "OUT OF STOCK!" : "low"
      response += `• **${i.name}**: ${i.currentStock}/${i.minStock} ${i.unit} (${status})\n`
    })
    if (items.length > 5) {
      response += `\n...and ${items.length - 5} more items`
    }
    return response
  }
  
  if (toolName === "get_stock_summary") {
    const d = result.data || {}
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
    const items = result.data || []
    if (items.length === 0) return "Everything looks good boss! No restocking needed."
    
    let response = `📋 **Recommended Restock:**\n\n`
    items.slice(0, 5).forEach((i: Record<string, unknown>) => {
      response += `• **${i.name}**: Order ${i.recommended_order_quantity} ${i.unit}\n`
      response += `   Priority: ${i.priority} | Est. RM${i.estimated_cost_rm}\n`
    })
    
    const totalCost = result.total_estimated_cost_rm
    response += `\n💵 **Total Estimated: RM${totalCost}**`
    
    return response
  }
  
  if (toolName === "restock_item") {
    const item = result.data || {}
    const newStock = result.new_stock
    const added = result.added_quantity
    return `✅ **Done!** Added ${added} to ${item.name}. New stock: ${newStock} ${item.unit}`
  }
  
  if (toolName === "generate_order_draft") {
    const msg = result.message
    const total = result.total_rm
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

IMPORTANT TOOLS:
- get_all_inventory: Check all items (no args)
- get_low_stock_items: See what's low/out (no args)
- get_stock_summary: Overall stats (no args)
- get_optimal_supplier: Find cheapest supplier (needs item name)
- restock_item: Add stock (needs id + quantity)
- get_recommended_restock: AI suggestions (no args)

HOW TO TALK:
1. Use friendly, casual language
2. Always format nicely with emojis and bold text
3. Show savings when comparing suppliers
4. Keep responses short and clear
5. Use Markdown for bold (**text**) and bullets (•)

EXAMPLES:
- "Sure boss, let me check..." 
- "Found it! Best price is from [Supplier] at RMxxx"
- "You can save RMxxx by choosing this supplier!"
- "Already added more stock for you!"

When user asks about inventory:
1. Use the right tool
2. Format the result nicely with emojis
3. Add helpful suggestions

Start your response by acknowledging what the user wants, then give the answer.`

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
      const toolName = toolCall.function.name
      const args = JSON.parse(toolCall.function.arguments)

      console.log(`[Tool] ${toolName}:`, args)

      const toolResult = await executeTool(toolName, args)
      const formatted = formatToolResult(toolName, toolResult)

      const followUp = await client.chat.completions.create({
        model: ZAI_MODEL,
        messages: [
          ...messages as never,
          { role: "assistant" as const, content: null, tool_calls: [toolCall] as never },
          { role: "tool" as const, tool_call_id: toolCall.id, content: formatted } as never
        ] as never,
      })

      return NextResponse.json({ response: followUp.choices[0]?.message?.content || formatted })
    }

    const textResponse = response?.content || ""
    
    // FALLBACK: If no tool call, check keywords and call API directly
    const lower = message.toLowerCase()
    
    if (lower.includes("low stock") || lower.includes("need restock") || lower.includes("susu") || lower.includes("tak ada")) {
      const result = await executeTool("get_low_stock_items", {})
      return NextResponse.json({ response: formatToolResult("get_low_stock_items", result) })
    }
    
    if (lower.includes("supplier") || lower.includes("cheapest") || lower.includes("price") || lower.includes("cheap")) {
      // Try to extract item name
      const itemMatch = message.match(/(?:for|to|get)\s+([A-Za-z\s]+?)(?:\?|$)/i) || message.match(/([A-Za-z]+(?:\s+[A-Za-z]+)?)/)
      const itemName = itemMatch ? itemMatch[1].trim() : "Fresh Whole Milk"
      console.log("Looking for supplier:", itemName)
      const result = await executeTool("get_optimal_supplier", { name: itemName })
      return NextResponse.json({ response: formatToolResult("get_optimal_supplier", result) })
    }
    
    if (lower.includes("summary") || lower.includes("stats") || lower.includes("health") || lower.includes("report")) {
      const result = await executeTool("get_stock_summary", {})
      return NextResponse.json({ response: formatToolResult("get_stock_summary", result) })
    }
    
    if (lower.includes("recommend") || lower.includes("suggest")) {
      const result = await executeTool("get_recommended_restock", {})
      return NextResponse.json({ response: formatToolResult("get_recommended_restock", result) })
    }
    
    if (lower.includes("restock") || lower.includes("order") || lower.includes("add stock")) {
      // Try to find item to restock - pick first low stock item
      const lowStock = await executeTool("get_low_stock_items", {})
      if (lowStock.data && lowStock.data.length > 0) {
        const firstItem = lowStock.data[0]
        const qty = firstItem.minStock - firstItem.currentStock || 5
        const restockResult = await executeTool("restock_item", { id: firstItem.id, quantity: qty })
        return NextResponse.json({ response: formatToolResult("restock_item", restockResult) })
      }
      return NextResponse.json({ response: "Everything looks good boss! No items need restocking." })
    }
    
    return NextResponse.json({ response: textResponse || "Sure boss! What would you like to know? I can check stock levels, find cheapest suppliers, or help you restock." })
  } catch (error) {
    console.error("Agent API error:", error)
    return NextResponse.json(
      { error: "Agent error", details: String(error) },
      { status: 500 }
    )
  }
}