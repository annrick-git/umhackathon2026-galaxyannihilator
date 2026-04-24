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
  if (!result.success && !result.data) return `Error: ${result.error || "Unknown error"}`
  
  if (toolName === "get_optimal_supplier") {
    return `Best supplier: ${result.best_supplier} at RM${result.best_price_rm}\nNormalized: RM${result.normalized_price}/${result.normalized_unit}\nOptions: ${result.all_options_count}\nSavings: RM${result.potential_savings}`
  }
  if (toolName === "get_low_stock_items") {
    const items = result.data || []
    if (items.length === 0) return "All items are stocked!"
    return `Low stock (${items.length}):\n${items.slice(0, 5).map((i: Record<string, unknown>) => `- ${i.name}: ${i.currentStock}/${i.minStock}`).join("\n")}`
  }
  if (toolName === "get_stock_summary") {
    const d = result.data || {}
    return `Stock Summary:\n- Items: ${d.total_unique_items}\n- Low Stock: ${d.low_stock_items}\n- Out of Stock: ${d.out_of_stock_items}\n- Health: ${d.stock_health_percentage}%`
  }
  if (toolName === "generate_order_draft") {
    return `Order Message:\n${result.message}\n\nTotal: RM${result.total_rm}`
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

    const systemPrompt = `You are StockMaster AI, an intelligent inventory agent. 

IMPORTANT - You have access to tools:
- get_all_inventory: Get all items
- get_low_stock_items: Get items below minimum stock
- get_stock_summary: Get statistics  
- get_optimal_supplier: Compare suppliers, find cheapest (always use this!)
- restock_item: Add stock to an item (id + quantity)
- get_recommended_restock: Get AI recommendations

INSTRUCTIONS:
1. First get inventory data to check current stock
2. Use get_optimal_supplier to find best price
3. Compare suppliers and show savings
4. Use Manglish: "tak ada liao" = out of stock, "nak order" = want to order

When user asks about stock, use tools. When comparing prices, use get_optimal_supplier.
Show savings when you find a better deal!`

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

    if (response?.tool_calls) {
      const toolCall = response.tool_calls[0]
      const toolName = toolCall.function.name
      const args = JSON.parse(toolCall.function.arguments)

      console.log(`[Tool] ${toolName}`, args)

      const toolResult = await executeTool(toolName, args)
      const formatted = formatToolResult(toolName, toolResult)

      const followUp = await client.chat.completions.create({
        model: ZAI_MODEL,
        messages: [
          ...messages as never,
          { role: "assistant" as const, content: null, tool_calls: [toolCall] as never },
          { role: "tool" as const, tool_call_id: toolCall.id, content: formatted } as never },
        ] as never,
      })

      return NextResponse.json({ response: followUp.choices[0]?.message?.content || formatted })
    }

    return NextResponse.json({ response: response?.content || "I didn't understand that." })
  } catch (error) {
    console.error("Agent API error:", error)
    return NextResponse.json(
      { error: "Agent error", details: String(error) },
      { status: 500 }
    )
  }
}