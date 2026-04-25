"""
Agentic AI Inventory Tools - REST API
Port: 5001

This provides 22 tool endpoints for an agentic AI to manage inventory.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Database file path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INVENTORY_FILE = os.path.join(BASE_DIR, 'inventory.json')


# ============================================
# Unit Normalization Utilities
# ============================================

UNIT_CONVERSIONS = {
    "liter": {"liter": 1.0, "l": 1.0, "ml": 0.001, "gallon": 3.78541, "g": 0.001},
    "kg": {"kg": 1.0, "g": 0.001, "gram": 0.001, "lb": 0.453592, "oz": 0.0283495},
    "unit": {"unit": 1.0, "pcs": 1.0, "piece": 1.0, "roll": 1.0, "bag": 1.0, "box": 1.0, "jug": 1.0, "pouch": 1.0, "tub": 1.0, "jar": 1.0, "can": 1.0, "tin": 1.0},
}

UNIT_TO_BASE = {
    "liter": ["liter", "l", "ml", "gallon", "g"],
    "kg": ["kg", "g", "gram", "lb", "oz"],
    "unit": ["unit", "pcs", "piece", "roll", "bag", "box", "jug", "pouch", "tub", "jar", "can", "tin", "bag", "case", "pack", "carton", "pail"],
}


def normalize_to_base_unit(unit_str: str) -> tuple:
    """Detect base unit type (liter, kg, unit) and size from unit string"""
    unit_lower = unit_str.lower()
    
    for base, aliases in UNIT_TO_BASE.items():
        for alias in aliases:
            if alias in unit_lower:
                return base, alias
    return "unit", "unit"


def extract_unit_quantity(unit_str: str) -> float:
    """Extract numeric multiplier from unit string (e.g., 'Case of 1,000' -> 1000)"""
    import re
    numbers = re.findall(r'[\d,]+', unit_str)
    if numbers:
        return float(numbers[-1].replace(',', ''))
    return 1.0


def normalize_price(price: float, unit_str: str, base_unit: str = "liter") -> dict:
    """
    Normalize price to per-liter, per-kg, or per-unit base.
    
    Args:
        price: Price in RM
        unit_str: Unit description (e.g., "Case (12 x 1 Liter)", "3kg bag")
        base_unit: Target base unit ("liter", "kg", "unit")
    
    Returns:
        dict with normalized price per base unit
    """
    unit_lower = unit_str.lower()
    base_type, _ = normalize_to_base_unit(unit_str)
    qty = extract_unit_quantity(unit_str)
    
    if base_type == "liter" and base_unit == "liter":
        if "ml" in unit_lower:
            normalized = price / (qty * 1000)
        elif "gallon" in unit_lower:
            normalized = price / (qty * 3.78541)
        else:
            normalized = price / qty
    elif base_type == "kg" and base_unit == "kg":
        if "g" in unit_lower and "gallon" not in unit_lower:
            normalized = price / (qty * 1000)
        elif "lb" in unit_lower:
            normalized = price / (qty * 0.453592)
        else:
            normalized = price / qty
    else:
        normalized = price / qty
    
    return {
        "original_price": price,
        "original_unit": unit_str,
        "normalized_price_per_base": round(normalized, 4),
        "base_unit": base_unit,
        "quantity_in_unit": qty
    }


def load_inventory():
    """Load inventory data from JSON file"""
    try:
        with open(INVENTORY_FILE, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {"items": [], "suppliers": []}


def save_inventory(data):
    """Save inventory data to JSON file"""
    with open(INVENTORY_FILE, 'w') as f:
        json.dump(data, f, indent=2)
    return True


def find_item_by_id(items, item_id):
    """Find item by ID"""
    return next((item for item in items if item['id'] == str(item_id)), None)


def find_item_by_name(items, name):
    """Find item by name (case-insensitive partial match)"""
    name_lower = name.lower()
    return [item for item in items if name_lower in item['name'].lower()]


def get_item_supplier(item_name, suppliers):
    """Find supplier for a given item name"""
    for supplier in suppliers:
        for item in supplier.get('items', []):
            if item['name'].lower() == item_name.lower():
                return supplier['name']
    return None


# ============================================
# TOOL 1: Get All Inventory
# ============================================
@app.route('/api/tools/get_all_inventory', methods=['GET'])
def get_all_inventory():
    """Get all inventory items"""
    data = load_inventory()
    return jsonify({
        "success": True,
        "tool": "get_all_inventory",
        "count": len(data['items']),
        "data": data['items']
    })


# ============================================
# TOOL 2: Get Item by ID
# ============================================
@app.route('/api/tools/get_item_by_id', methods=['GET'])
def get_item_by_id():
    """Get item by ID"""
    item_id = request.args.get('id')
    if not item_id:
        return jsonify({"success": False, "error": "Missing 'id' parameter"}), 400
    
    data = load_inventory()
    item = find_item_by_id(data['items'], item_id)
    
    if not item:
        return jsonify({"success": False, "error": f"Item with id '{item_id}' not found"}), 404
    
    return jsonify({
        "success": True,
        "tool": "get_item_by_id",
        "data": item
    })


# ============================================
# TOOL 3: Get Item by Name
# ============================================
@app.route('/api/tools/get_item_by_name', methods=['GET'])
def get_item_by_name():
    """Search item by name (case-insensitive)"""
    name = request.args.get('name')
    if not name:
        return jsonify({"success": False, "error": "Missing 'name' parameter"}), 400
    
    data = load_inventory()
    items = find_item_by_name(data['items'], name)
    
    return jsonify({
        "success": True,
        "tool": "get_item_by_name",
        "count": len(items),
        "data": items
    })


# ============================================
# TOOL 4: Get Low Stock Items
# ============================================
@app.route('/api/tools/get_low_stock_items', methods=['GET'])
def get_low_stock_items():
    """Get items below minimum threshold"""
    data = load_inventory()
    low_stock = [item for item in data['items'] if item['currentStock'] < item['minStock']]
    
    return jsonify({
        "success": True,
        "tool": "get_low_stock_items",
        "count": len(low_stock),
        "data": low_stock,
        "summary": {
            "total_items": len(data['items']),
            "low_stock_count": len(low_stock),
            "well_stocked_count": len(data['items']) - len(low_stock)
        }
    })


# ============================================
# TOOL 5: Get Critical Stock Items
# ============================================
@app.route('/api/tools/get_critical_stock_items', methods=['GET'])
def get_critical_stock_items():
    """Get items at critical level (<50% of minStock)"""
    data = load_inventory()
    critical = [item for item in data['items'] if item['currentStock'] < (item['minStock'] * 0.5)]
    
    return jsonify({
        "success": True,
        "tool": "get_critical_stock_items",
        "count": len(critical),
        "data": critical,
        "message": "Items at critical level - immediate restocking recommended"
    })


# ============================================
# TOOL 6: Get Stock Summary
# ============================================
@app.route('/api/tools/get_stock_summary', methods=['GET'])
def get_stock_summary():
    """Get overall stock statistics"""
    data = load_inventory()
    items = data['items']
    
    total_items = len(items)
    low_stock = sum(1 for i in items if i['currentStock'] < i['minStock'])
    out_of_stock = sum(1 for i in items if i['currentStock'] == 0)
    well_stocked = total_items - low_stock
    
    total_current = sum(i['currentStock'] for i in items)
    total_min = sum(i['minStock'] for i in items)
    
    categories = {}
    for item in items:
        cat = item.get('category', 'Uncategorized')
        if cat not in categories:
            categories[cat] = {'count': 0, 'low_stock': 0}
        categories[cat]['count'] += 1
        if item['currentStock'] < item['minStock']:
            categories[cat]['low_stock'] += 1
    
    return jsonify({
        "success": True,
        "tool": "get_stock_summary",
        "data": {
            "total_unique_items": total_items,
            "low_stock_items": low_stock,
            "out_of_stock_items": out_of_stock,
            "well_stocked_items": well_stocked,
            "total_current_stock_units": total_current,
            "total_min_stock_units": total_min,
            "stock_health_percentage": round((well_stocked / total_items * 100) if total_items > 0 else 0, 2),
            "by_category": categories
        }
    })


# ============================================
# TOOL 7: Update Stock
# ============================================
@app.route('/api/tools/update_stock', methods=['POST'])
def update_stock():
    """Update current stock level to a specific value"""
    data = request.get_json()
    
    if not data or 'id' not in data or 'currentStock' not in data:
        return jsonify({"success": False, "error": "Missing required fields: 'id', 'currentStock'"}), 400
    
    inventory = load_inventory()
    item = find_item_by_id(inventory['items'], data['id'])
    
    if not item:
        return jsonify({"success": False, "error": f"Item with id '{data['id']}' not found"}), 404
    
    old_stock = item['currentStock']
    item['currentStock'] = data['currentStock']
    
    save_inventory(inventory)
    
    return jsonify({
        "success": True,
        "tool": "update_stock",
        "data": item,
        "previous_stock": old_stock,
        "message": f"Updated stock for {item['name']} to {data['currentStock']}"
    })


@app.route('/api/tools/delete_stock', methods=['POST'])
def delete_stock():
    """Delete/clear all stock for an item (set to 0)"""
    data = request.get_json()
    
    if not data or 'id' not in data:
        return jsonify({"success": False, "error": "Missing required field: 'id'"}), 400
    
    inventory = load_inventory()
    item = find_item_by_id(inventory['items'], data['id'])
    
    if not item:
        return jsonify({"success": False, "error": f"Item with id '{data['id']}' not found"}), 404
    
    old_stock = item['currentStock']
    item['currentStock'] = 0
    
    save_inventory(inventory)
    
    return jsonify({
        "success": True,
        "tool": "delete_stock",
        "data": item,
        "previous_stock": old_stock,
        "message": f"Deleted all stock for {item['name']}. Previous: {old_stock}"
    })


# ============================================
# TOOL 8: Restock Item
# ============================================
@app.route('/api/tools/restock_item', methods=['POST'])
def restock_item():
    """Add stock to an item (increase currentStock)"""
    data = request.get_json()
    
    if not data or 'id' not in data or 'quantity' not in data:
        return jsonify({"success": False, "error": "Missing required fields: 'id', 'quantity'"}), 400
    
    inventory = load_inventory()
    item = find_item_by_id(inventory['items'], data['id'])
    
    if not item:
        return jsonify({"success": False, "error": f"Item with id '{data['id']}' not found"}), 404
    
    old_stock = item['currentStock']
    item['currentStock'] += data['quantity']
    
    save_inventory(inventory)
    
    status = "In Stock" if item['currentStock'] >= item['minStock'] else "Low Stock"
    
    return jsonify({
        "success": True,
        "tool": "restock_item",
        "data": item,
        "previous_stock": old_stock,
        "added_quantity": data['quantity'],
        "new_stock": item['currentStock'],
        "status": status,
        "message": f"Added {data['quantity']} to {item['name']}. New stock: {item['currentStock']} ({status})"
    })


# ============================================
# TOOL 9: Restock All Critical Items
# ============================================
@app.route('/api/tools/restock_all_critical', methods=['POST'])
def restock_all_critical():
    """Auto-restock all critical items to their minimum level"""
    data = request.get_json()
    quantity_multiplier = data.get('multiplier', 1) if data else 1
    
    inventory = load_inventory()
    results = []
    
    for item in inventory['items']:
        if item['currentStock'] < item['minStock']:
            needed = (item['minStock'] - item['currentStock']) * quantity_multiplier
            needed = max(1, int(needed))
            
            old_stock = item['currentStock']
            item['currentStock'] += needed
            
            results.append({
                "id": item['id'],
                "name": item['name'],
                "previous_stock": old_stock,
                "added": needed,
                "new_stock": item['currentStock']
            })
    
    save_inventory(inventory)
    
    return jsonify({
        "success": True,
        "tool": "restock_all_critical",
        "items_restocked": len(results),
        "data": results,
        "message": f"Restocked {len(results)} critical items"
    })


# ============================================
# TOOL 10: Add New Item
# ============================================
@app.route('/api/tools/add_new_item', methods=['POST'])
def add_new_item():
    """Add new inventory item"""
    data = request.get_json()
    
    required = ['name', 'category', 'currentStock', 'minStock', 'unit']
    if not data or not all(field in data for field in required):
        return jsonify({"success": False, "error": f"Missing required fields: {required}"}), 400
    
    inventory = load_inventory()
    
    # Check for duplicate name
    if any(item['name'].lower() == data['name'].lower() for item in inventory['items']):
        return jsonify({"success": False, "error": f"Item '{data['name']}' already exists"}), 400
    
    # Generate new ID
    new_id = str(max([int(i['id']) for i in inventory['items']], default=0) + 1)
    
    new_item = {
        "id": new_id,
        "name": data['name'],
        "category": data['category'],
        "currentStock": data['currentStock'],
        "minStock": data['minStock'],
        "unit": data['unit']
    }
    
    inventory['items'].append(new_item)
    save_inventory(inventory)
    
    return jsonify({
        "success": True,
        "tool": "add_new_item",
        "data": new_item,
        "message": f"Added new item: {new_item['name']}"
    })


# ============================================
# TOOL 11: Remove Item
# ============================================
@app.route('/api/tools/remove_item', methods=['DELETE'])
def remove_item():
    """Delete an item from inventory"""
    item_id = request.args.get('id')
    if not item_id:
        return jsonify({"success": False, "error": "Missing 'id' parameter"}), 400
    
    inventory = load_inventory()
    item = find_item_by_id(inventory['items'], item_id)
    
    if not item:
        return jsonify({"success": False, "error": f"Item with id '{item_id}' not found"}), 404
    
    inventory['items'] = [i for i in inventory['items'] if i['id'] != item_id]
    save_inventory(inventory)
    
    return jsonify({
        "success": True,
        "tool": "remove_item",
        "deleted_item": item,
        "message": f"Deleted item: {item['name']}"
    })


# ============================================
# TOOL 12: Update Min Stock
# ============================================
@app.route('/api/tools/update_min_stock', methods=['PATCH'])
def update_min_stock():
    """Update minimum stock threshold"""
    data = request.get_json()
    
    if not data or 'id' not in data or 'minStock' not in data:
        return jsonify({"success": False, "error": "Missing required fields: 'id', 'minStock'"}), 400
    
    inventory = load_inventory()
    item = find_item_by_id(inventory['items'], data['id'])
    
    if not item:
        return jsonify({"success": False, "error": f"Item with id '{data['id']}' not found"}), 404
    
    old_min = item['minStock']
    item['minStock'] = data['minStock']
    
    save_inventory(inventory)
    
    return jsonify({
        "success": True,
        "tool": "update_min_stock",
        "data": item,
        "previous_min_stock": old_min,
        "new_min_stock": data['minStock'],
        "message": f"Updated {item['name']} min stock from {old_min} to {data['minStock']}"
    })


# ============================================
# TOOL 13: Update Item Price
# ============================================
@app.route('/api/tools/update_item_price', methods=['PATCH'])
def update_item_price():
    """Update item price (requires price info in suppliers)"""
    data = request.get_json()
    
    if not data or 'id' not in data or 'priceRM' not in data:
        return jsonify({"success": False, "error": "Missing required fields: 'id', 'priceRM'"}), 400
    
    inventory = load_inventory()
    item = find_item_by_id(inventory['items'], data['id'])
    
    if not item:
        return jsonify({"success": False, "error": f"Item with id '{data['id']}' not found"}), 404
    
    item['priceRM'] = data['priceRM']
    save_inventory(inventory)
    
    return jsonify({
        "success": True,
        "tool": "update_item_price",
        "data": item,
        "message": f"Updated {item['name']} price to RM{data['priceRM']}"
    })


# ============================================
# TOOL 14: Get Suppliers
# ============================================
@app.route('/api/tools/get_suppliers', methods=['GET'])
def get_suppliers():
    """Get all supplier information"""
    data = load_inventory()
    
    return jsonify({
        "success": True,
        "tool": "get_suppliers",
        "count": len(data['suppliers']),
        "data": data['suppliers']
    })


# ============================================
# TOOL 15: Get Items by Supplier
# ============================================
@app.route('/api/tools/get_items_by_supplier', methods=['GET'])
def get_items_by_supplier():
    """Get items from specific supplier"""
    supplier_name = request.args.get('supplier')
    if not supplier_name:
        return jsonify({"success": False, "error": "Missing 'supplier' parameter"}), 400
    
    data = load_inventory()
    supplier = next((s for s in data['suppliers'] if s['name'].lower() == supplier_name.lower()), None)
    
    if not supplier:
        return jsonify({"success": False, "error": f"Supplier '{supplier_name}' not found"}), 404
    
    return jsonify({
        "success": True,
        "tool": "get_items_by_supplier",
        "supplier": supplier['name'],
        "count": len(supplier['items']),
        "data": supplier['items']
    })


# ============================================
# TOOL 16: Get Recommended Restock
# ============================================
@app.route('/api/tools/get_recommended_restock', methods=['GET'])
def get_recommended_restock():
    """AI recommendation for restocking with supplier info"""
    data = load_inventory()
    low_stock = [item for item in data['items'] if item['currentStock'] < item['minStock']]
    
    recommendations = []
    for item in low_stock:
        gap = item['minStock'] - item['currentStock']
        supplier = get_item_supplier(item['name'], data['suppliers'])
        
        # Find price
        price = None
        for sup in data['suppliers']:
            for sup_item in sup.get('items', []):
                if sup_item['name'].lower() == item['name'].lower():
                    price = sup_item.get('priceRM')
                    break
        
        recommendations.append({
            "id": item['id'],
            "name": item['name'],
            "category": item['category'],
            "current_stock": item['currentStock'],
            "min_stock": item['minStock'],
            "gap": gap,
            "recommended_order_quantity": gap * 2,  # Order double to avoid frequent restocking
            "supplier": supplier,
            "estimated_cost_rm": price * gap if price else None,
            "priority": "CRITICAL" if item['currentStock'] == 0 else "HIGH" if item['currentStock'] < item['minStock'] * 0.5 else "MEDIUM"
        })
    
    # Sort by priority
    priority_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2}
    recommendations.sort(key=lambda x: priority_order.get(x['priority'], 3))
    
    total_estimated = sum(r.get('estimated_cost_rm', 0) for r in recommendations if r.get('estimated_cost_rm'))
    
    return jsonify({
        "success": True,
        "tool": "get_recommended_restock",
        "count": len(recommendations),
        "total_estimated_cost_rm": round(total_estimated, 2),
        "data": recommendations,
        "message": f"Found {len(recommendations)} items needing restock. Total estimated cost: RM{total_estimated:.2f}"
    })


# ============================================
# TOOL 17: Get Inventory Valuation
# ============================================
@app.route('/api/tools/get_inventory_valuation', methods=['GET'])
def get_inventory_valuation():
    """Calculate total inventory value"""
    data = load_inventory()
    
    total_value = 0
    item_values = []
    
    for item in data['items']:
        # Find price
        price = None
        for sup in data['suppliers']:
            for sup_item in sup.get('items', []):
                if sup_item['name'].lower() == item['name'].lower():
                    price = sup_item.get('priceRM')
                    break
        
        value = (item['currentStock'] * price) if price else 0
        total_value += value
        
        item_values.append({
            "id": item['id'],
            "name": item['name'],
            "currentStock": item['currentStock'],
            "unit_price_rm": price,
            "total_value_rm": round(value, 2)
        })
    
    # Group by category
    by_category = {}
    for item in data['items']:
        cat = item.get('category', 'Uncategorized')
        if cat not in by_category:
            by_category[cat] = 0
        
        price = None
        for sup in data['suppliers']:
            for sup_item in sup.get('items', []):
                if sup_item['name'].lower() == item['name'].lower():
                    price = sup_item.get('priceRM')
                    break
        
        if price:
            by_category[cat] += item['currentStock'] * price
    
    return jsonify({
        "success": True,
        "tool": "get_inventory_valuation",
        "total_inventory_value_rm": round(total_value, 2),
        "total_items": len(data['items']),
        "by_category": {k: round(v, 2) for k, v in by_category.items()},
        "item_details": item_values
    })


# ============================================
# TOOL 18: Search Inventory
# ============================================
@app.route('/api/tools/search_inventory', methods=['POST'])
def search_inventory():
    """Search inventory with multiple filters"""
    data = request.get_json() or {}
    
    inventory = load_inventory()
    results = inventory['items']
    
    # Filter by category
    if 'category' in data:
        results = [i for i in results if i.get('category', '').lower() == data['category'].lower()]
    
    # Filter by stock status
    if 'status' in data:
        status = data['status'].lower()
        if status == 'low':
            results = [i for i in results if i['currentStock'] < i['minStock']]
        elif status == 'out':
            results = [i for i in results if i['currentStock'] == 0]
        elif status == 'ok' or status == 'good':
            results = [i for i in results if i['currentStock'] >= i['minStock']]
    
    # Filter by name pattern
    if 'name_contains' in data:
        pattern = data['name_contains'].lower()
        results = [i for i in results if pattern in i['name'].lower()]
    
    # Filter by stock range
    if 'min_current' in data:
        results = [i for i in results if i['currentStock'] >= data['min_current']]
    if 'max_current' in data:
        results = [i for i in results if i['currentStock'] <= data['max_current']]
    
    return jsonify({
        "success": True,
        "tool": "search_inventory",
        "count": len(results),
        "filters_applied": data,
        "data": results
    })


# ============================================
# TOOL 19: Get Category Summary
# ============================================
@app.route('/api/tools/get_category_summary', methods=['GET'])
def get_category_summary():
    """Get stock summary by category"""
    data = load_inventory()
    
    categories = {}
    for item in data['items']:
        cat = item.get('category', 'Uncategorized')
        if cat not in categories:
            categories[cat] = {
                'total_items': 0,
                'total_stock': 0,
                'low_stock_items': 0,
                'items': []
            }
        
        categories[cat]['total_items'] += 1
        categories[cat]['total_stock'] += item['currentStock']
        
        if item['currentStock'] < item['minStock']:
            categories[cat]['low_stock_items'] += 1
        
        categories[cat]['items'].append({
            'id': item['id'],
            'name': item['name'],
            'currentStock': item['currentStock'],
            'minStock': item['minStock'],
            'status': 'Low' if item['currentStock'] < item['minStock'] else 'OK'
        })
    
    return jsonify({
        "success": True,
        "tool": "get_category_summary",
        "count": len(categories),
        "data": categories
    })


# ============================================
# TOOL 20: Bulk Update Stock
# ============================================
@app.route('/api/tools/bulk_update_stock', methods=['POST'])
def bulk_update_stock():
    """Update multiple items stock at once"""
    data = request.get_json()
    
    if not data or 'updates' not in data:
        return jsonify({"success": False, "error": "Missing 'updates' array"}), 400
    
    inventory = load_inventory()
    results = []
    errors = []
    
    for update in data['updates']:
        item_id = update.get('id')
        quantity = update.get('quantity')
        
        if not item_id or quantity is None:
            errors.append({"update": update, "error": "Missing id or quantity"})
            continue
        
        item = find_item_by_id(inventory['items'], item_id)
        if not item:
            errors.append({"id": item_id, "error": "Item not found"})
            continue
        
        old_stock = item['currentStock']
        item['currentStock'] = quantity
        
        results.append({
            "id": item_id,
            "name": item['name'],
            "previous_stock": old_stock,
            "new_stock": quantity
        })
    
    save_inventory(inventory)
    
    return jsonify({
        "success": True,
        "tool": "bulk_update_stock",
        "updated_count": len(results),
        "error_count": len(errors),
        "data": results,
        "errors": errors
    })


# ============================================
# TOOL 21: Export Inventory Report
# ============================================
@app.route('/api/tools/export_inventory_report', methods=['GET'])
def export_inventory_report():
    """Generate comprehensive inventory report"""
    data = load_inventory()
    items = data['items']
    
    # Calculate statistics
    total_items = len(items)
    low_stock = [i for i in items if i['currentStock'] < i['minStock']]
    out_of_stock = [i for i in items if i['currentStock'] == 0]
    
    # Calculate value
    total_value = 0
    for item in items:
        for sup in data['suppliers']:
            for sup_item in sup.get('items', []):
                if sup_item['name'].lower() == item['name'].lower():
                    total_value += item['currentStock'] * sup_item.get('priceRM', 0)
                    break
    
    report = {
        "report_generated_at": datetime.now().isoformat(),
        "summary": {
            "total_unique_items": total_items,
            "low_stock_count": len(low_stock),
            "out_of_stock_count": len(out_of_stock),
            "well_stocked_count": total_items - len(low_stock),
            "total_inventory_value_rm": round(total_value, 2)
        },
        "low_stock_items": low_stock,
        "out_of_stock_items": out_of_stock,
        "full_inventory": items,
        "suppliers": data['suppliers']
    }
    
    return jsonify({
        "success": True,
        "tool": "export_inventory_report",
        "data": report
    })


# ============================================
# TOOL 22: Health Check
# ============================================
@app.route('/api/tools/health_check', methods=['GET'])
def health_check():
    """Check if API is running"""
    return jsonify({
        "success": True,
        "tool": "health_check",
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "port": 5001,
        "message": "Agent Tools API is running. Use these tools for inventory management."
    })


# ============================================
# TOOL 23: Get Optimal Supplier
# ============================================
@app.route('/api/tools/get_optimal_supplier', methods=['GET'])
def get_optimal_supplier():
    """Find the best supplier for an item based on normalized price per unit"""
    item_name = request.args.get('name')
    if not item_name:
        return jsonify({"success": False, "error": "Missing 'name' parameter"}), 400
    
    data = load_inventory()
    item_lower = item_name.lower()
    
    supplier_options = []
    for supplier in data['suppliers']:
        for sup_item in supplier.get('items', []):
            if item_lower in sup_item['name'].lower():
                norm = normalize_price(sup_item.get('priceRM', 0), sup_item.get('unit', 'unit'))
                supplier_options.append({
                    "supplier_name": supplier['name'],
                    "item_name": sup_item['name'],
                    "unit": sup_item.get('unit'),
                    "price_rm": sup_item.get('priceRM'),
                    "normalized_price_per_unit": norm['normalized_price_per_base'],
                    "base_unit": norm['base_unit'],
                    "package_size": norm['quantity_in_unit']
                })
    
    if not supplier_options:
        return jsonify({"success": False, "error": f"No suppliers found for '{item_name}'"}), 404
    
    supplier_options.sort(key=lambda x: x['normalized_price_per_unit'])
    best = supplier_options[0]
    savings = None
    
    if len(supplier_options) > 1:
        worst = supplier_options[-1]
        savings = round(worst['normalized_price_per_unit'] - best['normalized_price_per_unit'], 2)
        savings_percentage = round((savings / worst['normalized_price_per_unit']) * 100, 1)
    
    return jsonify({
        "success": True,
        "tool": "get_optimal_supplier",
        "item_name": item_name,
        "best_supplier": best['supplier_name'],
        "best_price_rm": best['price_rm'],
        "best_unit": best['unit'],
        "normalized_price": best['normalized_price_per_unit'],
        "normalized_unit": best['base_unit'],
        "all_options_count": len(supplier_options),
        "all_options": supplier_options,
        "potential_savings_rm": savings,
        "message": f"Best: {best['supplier_name']} at RM{best['price_rm']} ({best['unit']})" + 
                   (f" | Save RM{savings} vs others!" if savings else "")
    })


# ============================================
# TOOL 24: Generate Order Draft
# ============================================
@app.route('/api/tools/generate_order_draft', methods=['POST'])
def generate_order_draft():
    """Generate a WhatsApp/Email order message for suppliers"""
    data = request.get_json()
    
    if not data or 'items' not in data:
        return jsonify({"success": False, "error": "Missing 'items' array"}), 400
    
    supplier_name = data.get('supplier', '')
    items = data['items']
    format_type = data.get('format', 'whatsapp').lower()
    
    total = 0
    item_lines = []
    for item in items:
        name = item.get('name', item.get('item_name', 'Unknown'))
        qty = item.get('quantity', 1)
        price = item.get('price_rm', item.get('priceRM', 0))
        subtotal = qty * price
        total += subtotal
        item_lines.append(f"{qty}x {name} (RM{price:.2f})")
    
    if format_type == 'whatsapp':
        message = f"Hi {supplier_name}!\n\nI'd like to order:\n" + "\n".join([f"- {line}" for line in item_lines]) + f"\n\nTotal: RM{total:.2f}\n\nPlease confirm. Thanks!\n- StockMaster AI"
    elif format_type == 'email':
        message = f"Dear {supplier_name},\n\nI would like to place an order for the following items:\n\n" + "\n".join([f"• {line}" for line in item_lines]) + f"\n\nTotal: RM{total:.2f}\n\nPlease confirm availability and provide an invoice.\n\nBest regards,\nStockMaster AI"
    else:
        message = "Order Summary:\n" + "\n".join(item_lines) + f"\n\nTotal: RM{total:.2f}"
    
    return jsonify({
        "success": True,
        "tool": "generate_order_draft",
        "supplier": supplier_name,
        "format": format_type,
        "item_count": len(items),
        "total_rm": round(total, 2),
        "message": message,
        "message_preview": message[:100] + "..." if len(message) > 100 else message
    })


# ============================================
# TOOL 25: Export to CSV
# ============================================
@app.route('/api/tools/export_inventory_csv', methods=['GET'])
def export_inventory_csv():
    """Export inventory to CSV format for Excel"""
    import csv
    import io
    
    data = load_inventory()
    items = data['items']
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['ID', 'Name', 'Category', 'Current Stock', 'Min Stock', 'Unit', 'Status'])
    
    for item in items:
        status = 'OK' if item['currentStock'] >= item['minStock'] else 'LOW' if item['currentStock'] > 0 else 'OUT'
        writer.writerow([
            item.get('id', ''),
            item.get('name', ''),
            item.get('category', ''),
            item.get('currentStock', 0),
            item.get('minStock', 0),
            item.get('unit', ''),
            status
        ])
    
    csv_content = output.getvalue()
    
    return jsonify({
        "success": True,
        "tool": "export_inventory_csv",
        "filename": "inventory_export.csv",
        "total_items": len(items),
        "csv_content": csv_content,
        "download_ready": True
    })


# ============================================
# TOOL 26: Create Supplier Order
# ============================================
@app.route('/api/tools/create_supplier_order', methods=['POST'])
def create_supplier_order():
    """Create a supplier order and update inventory + debt"""
    data = request.get_json()
    
    if not data or 'item_name' not in data or 'supplier_name' not in data or 'quantity' not in data:
        return jsonify({"success": False, "error": "Missing required fields: item_name, supplier_name, quantity"}), 400
    
    item_name = data['item_name']
    supplier_name = data['supplier_name']
    quantity = int(data['quantity'])
    unit_price = float(data.get('unit_price', 0))
    
    # Find item in inventory and update stock
    inventory = load_inventory()
    item = None
    for i in inventory['items']:
        if i['name'].lower() == item_name.lower():
            item = i
            break
    
    if item:
        item['currentStock'] += quantity
        save_inventory(inventory)
    
    # Update supplier debt
    import os
    base_dir = os.path.dirname(os.path.abspath(__file__))
    debt_file = os.path.join(base_dir, 'supplier_debt.json')
    debt_data = {"total_debt_rm": 0, "debts": []}
    if os.path.exists(debt_file):
        with open(debt_file, 'r') as f:
            debt_data = json.load(f)
    
    found = False
    for d in debt_data['debts']:
        if d['supplier_name'].lower() == supplier_name.lower():
            d['amount_owed'] += quantity * unit_price
            found = True
            break
    
    if not found:
        debt_data['debts'].append({
            "supplier_name": supplier_name,
            "amount_owed": quantity * unit_price
        })
    
    debt_data['total_debt_rm'] = sum(d['amount_owed'] for d in debt_data['debts'])
    
    with open(debt_file, 'w') as f:
        json.dump(debt_data, f, indent=2)
    
    return jsonify({
        "success": True,
        "tool": "create_supplier_order",
        "item_name": item_name,
        "supplier_name": supplier_name,
        "quantity": quantity,
        "total_rm": quantity * unit_price,
        "message": f"Order placed: {quantity}x {item_name} from {supplier_name}"
    })


# ============================================
# TOOL 27: Get Supplier Debt Summary
# ============================================
@app.route('/api/tools/get_supplier_debt_summary', methods=['GET'])
def get_supplier_debt_summary():
    """Get summary of supplier debts"""
    import os
    base_dir = os.path.dirname(os.path.abspath(__file__))
    debt_file = os.path.join(base_dir, 'supplier_debt.json')
    
    if os.path.exists(debt_file):
        with open(debt_file, 'r') as f:
            debt_data = json.load(f)
        return jsonify({
            "success": True,
            "total_debt_rm": debt_data.get('total_debt_rm', 0),
            "debts": debt_data.get('debts', [])
        })
    
    return jsonify({
        "success": True,
        "total_debt_rm": 0,
        "debts": []
    })


# ============================================
# TOOL 28: Repay Supplier Debt
# ============================================
@app.route('/api/tools/repay_supplier_debt', methods=['POST'])
def repay_supplier_debt():
    """Repay supplier debt"""
    data = request.get_json()
    
    if not data or 'supplier_name' not in data or 'amount' not in data:
        return jsonify({"success": False, "error": "Missing required fields: supplier_name, amount"}), 400
    
    supplier_name = data['supplier_name']
    amount = float(data['amount'])
    
    import os
    base_dir = os.path.dirname(os.path.abspath(__file__))
    debt_file = os.path.join(base_dir, 'supplier_debt.json')
    
    if not os.path.exists(debt_file):
        return jsonify({"success": False, "error": "No debt found"}), 400
    
    with open(debt_file, 'r') as f:
        debt_data = json.load(f)
    
    # Find and update supplier debt
    for d in debt_data['debts']:
        if d['supplier_name'].lower() == supplier_name.lower():
            if amount >= d['amount_owed']:
                debt_data['total_debt_rm'] -= d['amount_owed']
                d['amount_owed'] = 0
            else:
                d['amount_owed'] -= amount
                debt_data['total_debt_rm'] -= amount
            break
    
    with open(debt_file, 'w') as f:
        json.dump(debt_data, f, indent=2)
    
    remaining = sum(d['amount_owed'] for d in debt_data['debts'])
    
    return jsonify({
        "success": True,
        "message": f"Repaid RM {amount} to {supplier_name}",
        "remaining_debt": remaining
    })


# ============================================
# TOOL 29: Price History & Generator
# ============================================
import random
from datetime import datetime, timedelta

PRICE_HISTORY_FILE = os.path.join(BASE_DIR, 'price_history.json')

def generate_realistic_price(base_price):
    """Generate realistic price that fluctuates ±10% from base"""
    variation = random.uniform(-0.1, 0.1)
    return round(base_price * (1 + variation), 2)

def init_price_history(time_range=None):
    """Initialize or update price history for all supplier items"""
    import json
    suppliers_file = os.path.join(BASE_DIR, '..', 'main part', 'stockmaster-ui', 'data', 'suppliers.json')
    if not os.path.exists(suppliers_file):
        return
    
    with open(suppliers_file, 'r') as f:
        suppliers_data = json.load(f)
    
    history_data = {}
    now = datetime.now()
    
    for supplier in suppliers_data.get('suppliers', []):
        for item in supplier.get('items', []):
            item_name = item['name']
            base_price = item['priceRM']
            
            if item_name not in history_data:
                history_data[item_name] = {'base_price': base_price, 'prices': []}
            
            new_price = generate_realistic_price(base_price)
            timestamp = now.isoformat()
            
            history_data[item_name]['prices'].append({
                'timestamp': timestamp,
                'price': new_price,
                'supplier': supplier['name']
            })
            
            # Generate more entries for the past hour (every minute)
            if time_range == 'hour' or time_range is None:
                for mins_ago in range(1, 61):
                    past_time = now - timedelta(minutes=mins_ago)
                    past_price = generate_realistic_price(base_price)
                    history_data[item_name]['prices'].append({
                        'timestamp': past_time.isoformat(),
                        'price': past_price,
                        'supplier': supplier['name']
                    })
            
            # Generate day range: past 30 days, 1 entry every 12 hours
            if time_range == 'day' or time_range is None:
                for hours_ago in range(12, 744, 12):  # every 12 hours for 30 days
                    past_time = now - timedelta(hours=hours_ago)
                    past_price = generate_realistic_price(base_price)
                    history_data[item_name]['prices'].append({
                        'timestamp': past_time.isoformat(),
                        'price': past_price,
                        'supplier': supplier['name']
                    })
            
            # Generate month range: past year, 1 entry every 15 days
            if time_range == 'month' or time_range is None:
                for days_ago in range(15, 366, 15):  # every 15 days for ~1 year
                    past_time = now - timedelta(days=days_ago)
                    past_price = generate_realistic_price(base_price)
                    history_data[item_name]['prices'].append({
                        'timestamp': past_time.isoformat(),
                        'price': past_price,
                        'supplier': supplier['name']
                    })
            
            history_data[item_name]['prices'] = history_data[item_name]['prices'][-1000:]
    
    with open(PRICE_HISTORY_FILE, 'w') as f:
        json.dump(history_data, f, indent=2)
    
    return history_data

@app.route('/api/tools/update_prices', methods=['POST'])
def update_prices():
    """Update all prices with small random fluctuation"""
    history_data = init_price_history()
    return jsonify({"success": True, "message": "Prices updated", "items": len(history_data)})


@app.route('/api/tools/get_price_history', methods=['GET'])
def get_price_history():
    """Get price history for a specific item"""
    item_name = request.args.get('item_name', '')
    time_range = request.args.get('range', 'day')
    
    if not os.path.exists(PRICE_HISTORY_FILE):
        init_price_history()
    
    with open(PRICE_HISTORY_FILE, 'r') as f:
        history_data = json.load(f)
    
    if item_name and item_name in history_data:
        prices = history_data[item_name]['prices']
    else:
        return jsonify({"success": False, "error": "Item not found"}), 404
    
    now = datetime.now()
    if time_range == 'hour':
        cutoff = now - timedelta(minutes=60)
    elif time_range == 'month':
        cutoff = now - timedelta(days=365)
    else:  # day
        cutoff = now - timedelta(days=30)
    
    filtered = [p for p in prices if datetime.fromisoformat(p['timestamp']) > cutoff]
    
    return jsonify({
        "success": True,
        "item_name": item_name,
        "range": time_range,
        "prices": filtered
    })


@app.route('/api/tools/get_all_price_history', methods=['GET'])
def get_all_price_history():
    """Get all items price history summary"""
    if not os.path.exists(PRICE_HISTORY_FILE):
        init_price_history()
    
    with open(PRICE_HISTORY_FILE, 'r') as f:
        history_data = json.load(f)
    
    items = list(history_data.keys())
    return jsonify({"success": True, "items": items})


@app.route('/api/tools/start_price_tracking', methods=['POST'])
def start_price_tracking():
    """Start automatic price tracking (generates new prices every minute)"""
    import threading
    import time
    
    def track_prices():
        while True:
            time.sleep(60)
            init_price_history()
    
    thread = threading.Thread(target=track_prices, daemon=True)
    thread.start()
    
    return jsonify({"success": True, "message": "Price tracking started"})


@app.errorhandler(404)
def not_found(e):
    return jsonify({"success": False, "error": "Endpoint not found"}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({"success": False, "error": "Internal server error"}), 500


import threading
import time

def start_price_tracker():
    """Background price tracker"""
    while True:
        time.sleep(60)
        try:
            init_price_history()
        except:
            pass

# Start price tracking in background
tracker_thread = threading.Thread(target=start_price_tracker, daemon=True)
tracker_thread.start()


if __name__ == '__main__':
    print("=" * 60)
    print("Agentic AI Inventory Tools - REST API")
    print("=" * 60)
    print("Running on http://localhost:5001")
    print("\nAvailable Tools (25 endpoints):")
    print("  1. GET  /api/tools/get_all_inventory")
    print("  2. GET  /api/tools/get_item_by_id?id=...")
    print("  3. GET  /api/tools/get_item_by_name?name=...")
    print("  4. GET  /api/tools/get_low_stock_items")
    print("  5. GET  /api/tools/get_critical_stock_items")
    print("  6. GET  /api/tools/get_stock_summary")
    print("  7. POST /api/tools/update_stock")
    print("  8. POST /api/tools/restock_item")
    print("  9. POST /api/tools/restock_all_critical")
    print(" 10. POST /api/tools/add_new_item")
    print(" 11. DEL /api/tools/remove_item?id=...")
    print(" 12. PATCH /api/tools/update_min_stock")
    print(" 13. PATCH /api/tools/update_item_price")
    print(" 14. GET  /api/tools/get_suppliers")
    print(" 15. GET  /api/tools/get_items_by_supplier?supplier=...")
    print(" 16. GET  /api/tools/get_recommended_restock")
    print(" 17. GET  /api/tools/get_inventory_valuation")
    print(" 18. POST /api/tools/search_inventory")
    print(" 19. GET  /api/tools/get_category_summary")
    print(" 20. POST /api/tools/bulk_update_stock")
    print(" 21. GET  /api/tools/export_inventory_report")
    print(" 22. GET  /api/tools/health_check")
    print(" 23. GET  /api/tools/get_optimal_supplier?name=...")
    print(" 24. POST /api/tools/generate_order_draft")
    print(" 25. GET  /api/tools/export_inventory_csv")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5001, debug=True)