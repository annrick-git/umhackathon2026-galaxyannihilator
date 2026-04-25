"""
Agentic AI Inventory Manager
Uses ILMU.ai's ilmu-glm-5.1 model via OpenAI-compatible API

The agent can:
- Check inventory status
- Identify low/critical stock items
- Make restocking recommendations
- Execute restocking actions
- Generate reports
"""

import os
import json
import requests
from openai import OpenAI
from typing import Any, Optional

# ============================================
# Configuration
# ============================================

# Load .env file
env_file = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_file):
    with open(env_file, 'r') as f:
        for line in f:
            line = line.strip()
            if line and '=' in line and not line.startswith('#'):
                key, val = line.split('=', 1)
                os.environ.setdefault(key.strip(), val.strip())

# ILMU.ai API Configuration
# Get your API key from https://console.ilmu.ai/
ILMU_API_KEY = os.environ.get("ZAI_API_KEY", os.environ.get("ILMU_API_KEY", "YOUR_API_KEY_HERE"))
BASE_URL = os.environ.get("ZAI_BASE_URL", "https://api.ilmu.ai/v1")
MODEL = os.environ.get("ZAI_MODEL", "ilmu-glm-5.1")

# Tool API Base URL
TOOLS_API_BASE = "http://localhost:5001/api/tools"


# ============================================
# Tool Schemas (OpenAI Function Calling)
# ============================================

TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "get_all_inventory",
            "description": "Get all inventory items with their current stock levels, minimum stock thresholds, and categories",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_item_by_id",
            "description": "Get a specific inventory item by its ID",
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "description": "The unique ID of the inventory item"}
                },
                "required": ["id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_item_by_name",
            "description": "Search for inventory items by name (case-insensitive partial match)",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "The name or part of the name to search for"}
                },
                "required": ["name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_low_stock_items",
            "description": "Get all items that are below their minimum stock threshold (need restocking)",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_critical_stock_items",
            "description": "Get items at critical stock level (less than 50% of minimum threshold) - requires immediate restocking",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_stock_summary",
            "description": "Get overall inventory statistics including total items, low stock count, out of stock count, and health percentage",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_suppliers",
            "description": "Get all supplier information with their contact details and supplied items",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_items_by_supplier",
            "description": "Get all items available from a specific supplier",
            "parameters": {
                "type": "object",
                "properties": {
                    "supplier": {"type": "string", "description": "The name of the supplier"}
                },
                "required": ["supplier"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_recommended_restock",
            "description": "Get AI-powered restocking recommendations with suggested quantities, suppliers, and estimated costs",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_inventory_valuation",
            "description": "Calculate the total value of inventory based on supplier prices",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_category_summary",
            "description": "Get inventory breakdown by category with stock levels and low stock counts",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_inventory",
            "description": "Search inventory with multiple filters like category, status, name pattern, and stock range",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {"type": "string", "description": "Filter by category (e.g., 'Dairy', 'Tea', 'Packaging')"},
                    "status": {"type": "string", "description": "Filter by stock status: 'low', 'out', or 'ok'"},
                    "name_contains": {"type": "string", "description": "Filter by name pattern (case-insensitive)"},
                    "min_current": {"type": "number", "description": "Minimum current stock level"},
                    "max_current": {"type": "number", "description": "Maximum current stock level"}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_stock",
            "description": "Update/set the current stock level to a specific value for an item",
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "description": "The unique ID of the inventory item"},
                    "currentStock": {"type": "number", "description": "The new stock level to set"}
                },
                "required": ["id", "currentStock"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "restock_item",
            "description": "Add (increase) stock to an item - use this to restock a specific item",
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "description": "The unique ID of the inventory item to restock"},
                    "quantity": {"type": "number", "description": "The quantity to add to current stock"}
                },
                "required": ["id", "quantity"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "restock_all_critical",
            "description": "Automatically restock all critical/low stock items to bring them up to minimum level",
            "parameters": {
                "type": "object",
                "properties": {
                    "multiplier": {"type": "number", "description": "Optional multiplier for order quantity (default 1, use 2 for double minimum)"}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "add_new_item",
            "description": "Add a new item to the inventory database",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Name of the item"},
                    "category": {"type": "string", "description": "Category (e.g., 'Dairy', 'Tea', 'Packaging')"},
                    "currentStock": {"type": "number", "description": "Initial current stock level"},
                    "minStock": {"type": "number", "description": "Minimum stock threshold"},
                    "unit": {"type": "string", "description": "Unit of measurement (e.g., 'Case', 'kg', 'box')"}
                },
                "required": ["name", "category", "currentStock", "minStock", "unit"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "remove_item",
            "description": "Delete/remove an item completely from the inventory database",
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "description": "The unique ID of the inventory item to remove"}
                },
                "required": ["id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "decrease_stock",
            "description": "Decrease/use stock from an item (e.g., when product is sold or used in drinks)",
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "description": "The unique ID of the inventory item"},
                    "quantity": {"type": "number", "description": "The quantity to decrease from current stock"}
                },
                "required": ["id", "quantity"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "bulk_decrease_stock",
            "description": "Decrease stock for multiple items at once (e.g., after a busy day of sales)",
            "parameters": {
                "type": "object",
                "properties": {
                    "decreases": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "string"},
                                "quantity": {"type": "number"}
                            },
                            "required": ["id", "quantity"]
                        },
                        "description": "Array of decreases, each containing id and quantity"
                    }
                },
                "required": ["decreases"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_min_stock",
            "description": "Update the minimum stock threshold for an item",
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "description": "The unique ID of the inventory item"},
                    "minStock": {"type": "number", "description": "New minimum stock threshold"}
                },
                "required": ["id", "minStock"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "bulk_update_stock",
            "description": "Update stock levels for multiple items at once",
            "parameters": {
                "type": "object",
                "properties": {
                    "updates": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "string"},
                                "quantity": {"type": "number"}
                            },
                            "required": ["id", "quantity"]
                        },
                        "description": "Array of updates, each containing id and quantity"
                    }
                },
                "required": ["updates"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "export_inventory_report",
            "description": "Generate a comprehensive inventory report with all details, low stock items, and supplier info",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "health_check",
            "description": "Check if the inventory tools API is running and healthy",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_optimal_supplier",
            "description": "Find the best/cheapest supplier for an item by normalizing price to per-unit basis",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "The name of the item to compare suppliers for"}
                },
                "required": ["name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_order_draft",
            "description": "Generate a WhatsApp or Email order message to send to a supplier",
            "parameters": {
                "type": "object",
                "properties": {
                    "supplier": {"type": "string", "description": "The name of the supplier"},
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "quantity": {"type": "number"},
                                "price_rm": {"type": "number"}
                            }
                        },
                        "description": "Array of items with name, quantity, and price"
                    },
                    "format": {"type": "string", "description": "Format type: 'whatsapp' or 'email' (default: whatsapp)"}
                },
                "required": ["items"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "export_inventory_csv",
            "description": "Export inventory data to CSV format for download in Excel",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    }
]


# ============================================
# Tool Executor
# ============================================

def execute_tool(tool_name: str, arguments: dict) -> dict:
    """
    Execute a tool by making HTTP request to the tools API.
    
    Args:
        tool_name: Name of the tool to execute
        arguments: Dictionary of arguments for the tool
        
    Returns:
        JSON response from the API
    """
    url = f"{TOOLS_API_BASE}/{tool_name}"
    
    # Determine HTTP method based on tool
    # Read tools (GET)
    read_tools = [
        "get_all_inventory", "get_item_by_id", "get_item_by_name",
        "get_low_stock_items", "get_critical_stock_items", "get_stock_summary",
        "get_suppliers", "get_items_by_supplier", "get_recommended_restock",
        "get_inventory_valuation", "get_category_summary", "export_inventory_report",
        "health_check", "get_optimal_supplier", "export_inventory_csv"
    ]
    
    # Write tools that need JSON body
    write_json_tools = [
        "update_stock", "restock_item", "restock_all_critical",
        "add_new_item", "search_inventory", "bulk_update_stock",
        "generate_order_draft", "decrease_stock", "bulk_decrease_stock"
    ]
    
    try:
        if tool_name in read_tools and not arguments:
            # GET request with no body
            response = requests.get(url, timeout=30)
        elif tool_name in ["get_item_by_id", "get_item_by_name", "get_items_by_supplier"]:
            # GET request with query params
            response = requests.get(url, params=arguments, timeout=30)
        elif tool_name == "remove_item":
            # DELETE request
            response = requests.delete(url, params=arguments, timeout=30)
        elif tool_name == "update_min_stock" or tool_name == "update_item_price":
            # PATCH request
            response = requests.patch(url, json=arguments, timeout=30)
        else:
            # POST request with JSON body
            response = requests.post(url, json=arguments, timeout=30)
        
        response.raise_for_status()
        return response.json()
        
    except requests.exceptions.ConnectionError:
        return {"success": False, "error": f"Could not connect to {TOOLS_API_BASE}. Is the server running?"}
    except requests.exceptions.Timeout:
        return {"success": False, "error": "Request timed out"}
    except requests.exceptions.HTTPError as e:
        return {"success": False, "error": f"HTTP error: {e}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def format_tool_result(tool_name: str, result: dict) -> str:
    """Format tool result for the LLM context window"""
    if not result.get("success", False):
        return f"Error: {result.get('error', 'Unknown error')}"
    
    # Format based on tool type
    if tool_name == "get_all_inventory":
        items = result.get("data", [])
        if not items:
            return "No inventory items found."
        lines = ["📦 INVENTORY LIST ({0} items):".format(len(items)), ""]
        for item in items:
            status = "⚠️ LOW" if item['currentStock'] < item['minStock'] else "✓ OK"
            lines.append("{status} {name}: {curr}/{min} {unit}".format(
                status=status,
                name=item['name'],
                curr=item['currentStock'],
                min=item['minStock'],
                unit=item.get('unit', '')
            ))
        return "\n".join(lines[:30])
    
    elif tool_name == "get_item_by_id":
        item = result.get("data", {})
        if not item:
            return "Item not found."
        status = "⚠️ LOW" if item['currentStock'] < item['minStock'] else "✓ OK"
        return "📦 {name}\n  Category: {cat}\n  Stock: {curr}/{min} {unit} [{status}]".format(
            name=item['name'],
            cat=item.get('category', ''),
            curr=item['currentStock'],
            min=item['minStock'],
            unit=item.get('unit', ''),
            status=status
        )
    
    elif tool_name == "get_item_by_name":
        items = result.get("data", [])
        if not items:
            return "No items found."
        lines = ["🔍 Found {0} items:".format(len(items)), ""]
        for item in items:
            status = "⚠️ LOW" if item['currentStock'] < item['minStock'] else "✓ OK"
            lines.append("{status} {name}: {curr}/{min} {unit}".format(
                status=status,
                name=item['name'],
                curr=item['currentStock'],
                min=item['minStock'],
                unit=item.get('unit', '')
            ))
        return "\n".join(lines)
    
    elif tool_name == "get_low_stock_items":
        items = result.get("data", [])
        if not items:
            return "✅ All items are sufficiently stocked!"
        lines = ["⚠️ LOW STOCK ITEMS ({0}):".format(len(items)), ""]
        for i, item in enumerate(items, 1):
            lines.append("{i}. {name}\n   Stock: {curr}/{min} {unit}".format(
                i=i,
                name=item['name'],
                curr=item['currentStock'],
                min=item['minStock'],
                unit=item.get('unit', '')
            ))
        return "\n".join(lines)
    
    elif tool_name == "get_critical_stock_items":
        items = result.get("data", [])
        if not items:
            return "✅ No critical stock items!"
        lines = ["🚨 CRITICAL - NEED IMMEDIATE RESTOCK ({0}):".format(len(items)), ""]
        for i, item in enumerate(items, 1):
            lines.append("{i}. {name} - ONLY {curr} LEFT!".format(
                i=i,
                name=item['name'],
                curr=item['currentStock']
            ))
        return "\n".join(lines)
    
    elif tool_name == "get_recommended_restock":
        items = result.get("data", [])
        if not items:
            return "✅ No restocking needed!"
        total = result.get('total_estimated_cost_rm', 0)
        lines = ["📋 RECOMMENDED RESTOCK ({0} items) - Est. RM{1}:".format(len(items), total), ""]
        for i, item in enumerate(items[:8], 1):
            priority_emoji = "🔴" if item['priority'] == "CRITICAL" else "🟡" if item['priority'] == "HIGH" else "🟢"
            lines.append("{i}. {priority} {name}\n   Order: {qty} {unit}".format(
                i=i,
                priority=priority_emoji,
                name=item['name'],
                qty=item['recommended_order_quantity'],
                unit=item.get('unit', '')
            ))
        return "\n".join(lines)
    
    elif tool_name == "get_stock_summary":
        data = result.get("data", {})
        health = data.get('stock_health_percentage', 0)
        emoji = "🟢" if health >= 80 else "🟡" if health >= 50 else "🔴"
        return """📊 STOCK SUMMARY
━━━━━━━━━━━━━━━━━━━━━
  Total Items: {total}
  ✅ Well-stocked: {well}
  ⚠️ Low Stock: {low}
  🚨 Out of Stock: {out}
  Health: {emoji} {health}%
━━━━━━━━━━━━━━━━━━━━━""".format(
            total=data.get('total_unique_items', 0),
            well=data.get('well_stocked_items', 0),
            low=data.get('low_stock_items', 0),
            out=data.get('out_of_stock_items', 0),
            emoji=emoji,
            health=health
        )
    
    elif tool_name == "get_suppliers":
        suppliers = result.get("data", [])
        if not suppliers:
            return "No suppliers found."
        lines = ["🏭 SUPPLIERS ({0}):".format(len(suppliers)), ""]
        for s in suppliers:
            lines.append("• {name}".format(name=s['name']))
            if 'contact' in s:
                lines.append("  Contact: {contact}".format(contact=s.get('contact', '')))
        return "\n".join(lines)
    
    elif tool_name == "get_items_by_supplier":
        items = result.get("data", [])
        supplier = result.get("supplier", "")
        if not items:
            return "No items from this supplier."
        lines = ["📦 Items from {0}:".format(supplier), ""]
        for item in items:
            lines.append("• {name} - RM{price}".format(
                name=item['name'],
                price=item.get('priceRM', 'N/A')
            ))
        return "\n".join(lines)
    
    elif tool_name == "get_category_summary":
        data = result.get("data", {})
        lines = ["📁 INVENTORY BY CATEGORY", ""]
        for cat, info in sorted(data.items()):
            lines.append("📂 {cat}: {count} items ({low} low stock)".format(
                cat=cat,
                count=info['total_items'],
                low=info['low_stock_items']
            ))
        return "\n".join(lines)
    
    elif tool_name == "get_inventory_valuation":
        total = result.get("total_inventory_value_rm", 0)
        by_cat = result.get("by_category", {})
        lines = ["💰 INVENTORY VALUATION: RM{0}".format(total), ""]
        for cat, value in sorted(by_cat.items()):
            lines.append("  {cat}: RM{value}".format(cat=cat, value=value))
        return "\n".join(lines)
    
    elif tool_name == "restock_item":
        item = result.get("data", {})
        return "✅ Restocked: {name}\n   New stock: {curr} {unit}".format(
            name=item.get('name', ''),
            curr=item.get('currentStock', 0),
            unit=item.get('unit', '')
        )
    
    elif tool_name == "restock_all_critical":
        count = result.get('items_restocked', 0)
        items = result.get('data', [])[:5]
        names = ", ".join([r['name'] for r in items])
        return "✅ Restocked {count} items: {names}".format(count=count, names=names)
    
    elif tool_name == "get_optimal_supplier":
        item_name = result.get('item_name', '')
        best = result.get('best_supplier', '')
        price = result.get('best_price_rm', 0)
        norm = result.get('normalized_price', 0)
        unit = result.get('normalized_unit', '')
        savings = result.get('potential_savings_rm')
        msg = "🏆 Best supplier for {0}: {1}\n   Price: RM{2}\n   Per {3}: RM{4}".format(
            item_name, best, price, unit, norm
        )
        if savings:
            msg += "\n   💰 Save RM{0}!".format(savings)
        return msg
    
    elif tool_name == "generate_order_draft":
        msg = result.get('message', '')
        total = result.get('total_rm', 0)
        return "📝 ORDER DRAFT (RM{0}):\n\n{1}".format(total, msg)
    
    elif tool_name == "export_inventory_csv":
        count = result.get('total_items', 0)
        return "📊 CSV Export ready: {0} items".format(count)
    
    elif tool_name == "export_inventory_report":
        summary = result.get('data', {}).get('summary', {})
        return "📋 INVENTORY REPORT:\n  Total: {total}\n  Low: {low}\n  Out: {out}\n  Value: RM{value}".format(
            total=summary.get('total_unique_items', 0),
            low=summary.get('low_stock_count', 0),
            out=summary.get('out_of_stock_count', 0),
            value=summary.get('total_inventory_value_rm', 0)
        )
    
    elif tool_name == "search_inventory":
        items = result.get("data", [])
        filters = result.get("filters_applied", {})
        if not items:
            return "No items match your search."
        lines = ["🔍 Found {0} items:".format(len(items)), ""]
        for item in items:
            status = "⚠️ LOW" if item['currentStock'] < item['minStock'] else "✓"
            lines.append("{status} {name}: {curr}/{min}".format(
                status=status,
                name=item['name'],
                curr=item['currentStock'],
                min=item['minStock']
            ))
        return "\n".join(lines)
    
    elif tool_name == "add_new_item":
        item = result.get("data", {})
        return "✅ Added: {name} ({cat})\n   Stock: {stock} {unit}".format(
            name=item.get('name', ''),
            cat=item.get('category', ''),
            stock=item.get('currentStock', 0),
            unit=item.get('unit', '')
        )
    
    elif tool_name == "remove_item":
        item = result.get("deleted_item", {})
        return "🗑️ Removed: {name}".format(name=item.get('name', ''))
    
    elif tool_name == "decrease_stock":
        item = result.get("data", {})
        curr = result.get('new_stock', 0)
        status = result.get('status', '')
        status_emoji = "🚨" if curr == 0 else "⚠️" if curr < item.get('minStock', 0) else "✅"
        return "➖ Decreased: {name}\n   New stock: {curr} {unit} [{emoji}{status}]".format(
            name=item.get('name', ''),
            curr=curr,
            unit=item.get('unit', ''),
            emoji=status_emoji,
            status=status
        )
    
    elif tool_name == "bulk_decrease_stock":
        results_list = result.get('data', [])
        count = result.get('updated_count', 0)
        lines = ["➖ Bulk Decreased ({0} items):".format(count), ""]
        for r in results_list[:5]:
            lines.append("  • {name}: {prev} → {new}".format(
                name=r['name'],
                prev=r['previous_stock'],
                new=r['new_stock']
            ))
        return "\n".join(lines)
    
    elif tool_name == "health_check":
        return "✅ Server healthy! Running on port {0}".format(result.get('port', 5001))
    
    elif tool_name == "get_stock_by_category":
        items = result.get("data", [])
        if not items:
            return "No items in this category."
        lines = ["📂 Category items:", ""]
        for item in items:
            status = "⚠️" if item['currentStock'] < item['minStock'] else "✓"
            lines.append("{status} {name}: {curr}/{min}".format(
                status=status,
                name=item['name'],
                curr=item['currentStock'],
                min=item['minStock']
            ))
        return "\n".join(lines)
    
    else:
        # Generic formatting - show key info nicely
        return json.dumps(result, indent=2)[:2000]


# ============================================
# Agent Loop
# ============================================

def run_agent(prompt: str, max_iterations: int = 10) -> str:
    """
    Run the agent with a given prompt.
    
    Args:
        prompt: The user's request/prompt
        max_iterations: Maximum number of tool calls before finishing
        
    Returns:
        Final response from the agent
    """
    # Initialize OpenAI client for ILMU.ai
    client = OpenAI(
        api_key=ILMU_API_KEY,
        base_url=BASE_URL
    )
    
    # System message defining the agent's role
    system_message = """You are StockMaster AI, an intelligent inventory management assistant for a milk tea shop in Malaysia.

You understand Malaysian English (Manglish) and local expressions:
- "Tak ada liao" / "tiada" = item is out of stock / not available
- "Bawak" / "Bawa" = bring/get
- "Order" = restock / buy
- "Sini sini" = here
- "Mana" = where
- "Nak" = want
- "Tak" = don't want / not
- "Sikit" = a little
- "Habis" = finished / gone
- "Kosong" = empty / zero stock
- "Ready" = available in stock
- "Selling" = for sale / we have
- "Beli" = buy

Your job is to help manage inventory, identify items that need restocking, and take actions to keep the shop running smoothly.

You have access to various tools to:
- Check inventory levels (get_all_inventory, get_low_stock_items, get_critical_stock_items)
- Get restocking recommendations (get_recommended_restock)
- Find best supplier by price (get_optimal_supplier)
- Restock items (restock_item, restock_all_critical)
- Get supplier information (get_suppliers, get_items_by_supplier)
- Get inventory statistics (get_stock_summary, get_inventory_valuation)
- Search and filter inventory (search_inventory, get_category_summary)
- Add or remove items (add_new_item, remove_item)
- Update stock levels (update_stock, bulk_update_stock, update_min_stock)
- Generate order messages for WhatsApp (generate_order_draft)
- Export to CSV/Excel (export_inventory_csv)
- Generate reports (export_inventory_report)

When analyzing inventory:
1. First check the current stock levels using appropriate tools
2. Identify which items are low or critical
3. Get recommendations for restocking
4. Find optimal supplier using get_optimal_supplier
5. Execute restocking actions when needed
6. Provide a clear summary of what actions were taken
7. Show potential savings from comparing suppliers

Always be helpful, proactive, and provide clear recommendations to the user.
If you need to take multiple actions, do them one at a time and explain each step.
When restocking, consider the minimum stock levels and order enough to avoid frequent restocking.
Show the savings when you find a better supplier than the current one."""
    
    # Build messages
    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": prompt}
    ]
    
    print("\n" + "="*60)
    print("AGENT STARTED")
    print("="*60)
    print(f"User prompt: {prompt}")
    print("="*60 + "\n")
    
    for iteration in range(max_iterations):
        print(f"[Iteration {iteration + 1}] Calling LLM...")
        
        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=messages,
                tools=TOOL_SCHEMAS,
                temperature=0.7,
                max_tokens=4000
            )
            
            # Check if LLM wants to use a tool
            if response.choices[0].message.tool_calls:
                tool_call = response.choices[0].message.tool_calls[0]
                tool_name = tool_call.function.name
                tool_args = json.loads(tool_call.function.arguments)
                
                print(f"[Tool Call] {tool_name}")
                print(f"[Arguments] {tool_args}")
                
                # Execute the tool
                print(f"[Executing] {tool_name}...")
                tool_result = execute_tool(tool_name, tool_args)
                formatted_result = format_tool_result(tool_name, tool_result)
                
                print(f"[Result] {formatted_result[:200]}...")
                
                # Add tool call and result to messages
                messages.append({
                    "role": "assistant",
                    "content": None,
                    "tool_calls": [
                        {
                            "id": tool_call.id,
                            "type": "function",
                            "function": {
                                "name": tool_name,
                                "arguments": tool_call.function.arguments
                            }
                        }
                    ]
                })
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": formatted_result
                })
                
            else:
                # No tool call - LLM is providing final answer
                final_response = response.choices[0].message.content
                print("\n" + "="*60)
                print("AGENT COMPLETED")
                print("="*60)
                print(f"Final response:\n{final_response}")
                print("="*60 + "\n")
                return final_response
                
        except Exception as e:
            error_msg = f"Error: {str(e)}"
            print(f"[Error] {error_msg}")
            return f"I encountered an error: {error_msg}"
    
    return "Maximum iterations reached. The task may require more steps."


def run_agent_simple(prompt: str) -> str:
    """Simple synchronous run_agent wrapper"""
    return run_agent(prompt)


# ============================================
# Main Entry Point
# ============================================

if __name__ == "__main__":
    import sys
    import io
    
    # Fix Unicode encoding issue on Windows
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    
    print("="*60)
    print("Agentic AI Inventory Manager")
    print("="*60)
    
    # Check API key
    if ILMU_API_KEY == "YOUR_API_KEY_HERE":
        print("\n[!] WARNING: Please set your ZAI_API_KEY in .env file or as an environment variable")
        print("   Get your API key from: https://console.ilmu.ai/")
        print("")
    
    # Check if tools API is running
    try:
        health = execute_tool("health_check", {})
        if health.get("success"):
            print("[OK] Tools API is running on http://localhost:5001")
        else:
            print("[!] Tools API may not be running. Start it with: python agent_tools.py")
    except:
        print("[!] Could not connect to Tools API. Make sure agent_tools.py is running.")
    
    print("\n" + "="*60)
    
    if len(sys.argv) > 1:
        # Run with command line argument
        user_prompt = " ".join(sys.argv[1:])
        print(f"Running with prompt: {user_prompt}\n")
        result = run_agent(user_prompt)
        print("\n" + "="*60)
        print("RESULT:")
        print("="*60)
        print(result)
    else:
        # Interactive mode
        print("Interactive Mode - Type your request")
        print("(or type 'exit' to quit)")
        print("="*60 + "\n")
        
        while True:
            try:
                user_input = input("\nYou: ").strip()
                if not user_input:
                    continue
                if user_input.lower() in ['exit', 'quit', 'q']:
                    print("Goodbye!")
                    break
                    
                result = run_agent(user_input)
                print("\n" + "="*60)
                print("Agent Response:")
                print("="*60)
                print(result)
                
            except KeyboardInterrupt:
                print("\nGoodbye!")
                break
            except Exception as e:
                print(f"Error: {e}")