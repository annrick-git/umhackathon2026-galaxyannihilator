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
        "new_stock": data['currentStock'],
        "message": f"Updated {item['name']} stock from {old_stock} to {data['currentStock']}"
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
# Error Handlers
# ============================================
@app.errorhandler(404)
def not_found(e):
    return jsonify({"success": False, "error": "Endpoint not found"}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({"success": False, "error": "Internal server error"}), 500


if __name__ == '__main__':
    print("=" * 60)
    print("Agentic AI Inventory Tools - REST API")
    print("=" * 60)
    print("Running on http://localhost:5001")
    print("\nAvailable Tools (22 endpoints):")
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
    print("=" * 60)
    app.run(host='0.0.0.0', port=5001, debug=True)