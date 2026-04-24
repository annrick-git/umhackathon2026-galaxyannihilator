"""
Test script for StockMaster AI functions
Run: python test_functions.py
"""

import requests
import json

BASE_URL = "http://localhost:5001/api/tools"

def test_health_check():
    print("\n" + "="*50)
    print("TEST 1: Health Check")
    print("="*50)
    res = requests.get(f"{BASE_URL}/health_check")
    print(json.dumps(res.json(), indent=2))

def test_get_inventory():
    print("\n" + "="*50)
    print("TEST 2: Get All Inventory")
    print("="*50)
    res = requests.get(f"{BASE_URL}/get_all_inventory")
    data = res.json()
    print(f"Total items: {data.get('count')}")
    print("Sample items:", [item['name'] for item in data.get('data', [])[:5]])

def test_low_stock():
    print("\n" + "="*50)
    print("TEST 3: Get Low Stock Items")
    print("="*50)
    res = requests.get(f"{BASE_URL}/get_low_stock_items")
    data = res.json()
    print(f"Low stock count: {data.get('count')}")
    for item in data.get('data', [])[:3]:
        print(f"  - {item['name']}: {item['currentStock']}/{item['minStock']} {item['unit']}")

def test_optimal_supplier():
    print("\n" + "="*50)
    print("TEST 4: Get Optimal Supplier (Fresh Whole Milk)")
    print("="*50)
    res = requests.get(f"{BASE_URL}/get_optimal_supplier?name=Fresh%20Whole%20Milk")
    data = res.json()
    if data.get('success'):
        print(f"Best supplier: {data.get('best_supplier')}")
        print(f"Price: RM{data.get('best_price_rm')} ({data.get('best_unit')})")
        print(f"Normalized: RM{data.get('normalized_price')}/{data.get('normalized_unit')}")
        print(f"Savings: RM{data.get('potential_savings_rm')}")
        print("\nAll options:")
        for opt in data.get('all_options', []):
            print(f"  - {opt['supplier_name']}: RM/opt['price_rm'] -> RM{opt['normalized_price_per_unit']}/{opt['base_unit']}")
    else:
        print(json.dumps(data, indent=2))

def test_generate_order():
    print("\n" + "="*50)
    print("TEST 5: Generate WhatsApp Order Draft")
    print("="*50)
    payload = {
        "supplier": "Dairy Farms Inc.",
        "items": [
            {"name": "Fresh Whole Milk", "quantity": 5, "priceRM": 73.12},
            {"name": "Evaporated Milk", "quantity": 2, "priceRM": 145.00}
        ],
        "format": "whatsapp"
    }
    res = requests.post(f"{BASE_URL}/generate_order_draft", json=payload)
    data = res.json()
    if data.get('success'):
        print(f"Total: RM{data.get('total_rm')}")
        print("\nMessage:")
        print("-" * 40)
        print(data.get('message'))
    else:
        print(json.dumps(data, indent=2))

def test_export_csv():
    print("\n" + "="*50)
    print("TEST 6: Export Inventory to CSV")
    print("="*50)
    res = requests.get(f"{BASE_URL}/export_inventory_csv")
    data = res.json()
    print(f"Total items: {data.get('total_items')}")
    print(f"CSV preview (first 500 chars):")
    print(data.get('csv_content', '')[:500])

def test_suppliers():
    print("\n" + "="*50)
    print("TEST 7: Get All Suppliers")
    print("="*50)
    res = requests.get(f"{BASE_URL}/get_suppliers")
    data = res.json()
    print(f"Total suppliers: {data.get('count')}")
    for sup in data.get('data', [])[:3]:
        print(f"  - {sup['name']}: {len(sup.get('items', []))} items")

def test_stock_summary():
    print("\n" + "="*50)
    print("TEST 8: Stock Summary")
    print("="*50)
    res = requests.get(f"{BASE_URL}/get_stock_summary")
    data = res.json()
    summary = data.get('data', {})
    print(f"Total unique items: {summary.get('total_unique_items')}")
    print(f"Low stock items: {summary.get('low_stock_items')}")
    print(f"Out of stock: {summary.get('out_of_stock_items')}")
    print(f"Health%: {summary.get('stock_health_percentage')}")

if __name__ == "__main__":
    print("Testing StockMaster AI Functions...")
    print("Make sure backend is running: python agent_tools.py")
    
    try:
        test_health_check()
        test_get_inventory()
        test_low_stock()
        test_optimal_supplier()
        test_generate_order()
        test_export_csv()
        test_suppliers()
        test_stock_summary()
        
        print("\n" + "="*50)
        print("ALL TESTS PASSED!")
        print("="*50)
    except Exception as e:
        print(f"Error: {e}")
        print("Make sure backend is running on port 5001")