@echo off
echo ============================================
echo StockMaster AI Backend Test
echo ============================================
echo.

echo [Test 1] Checking Health...
python -c "import requests; r = requests.get('http://localhost:5001/api/tools/health_check'); print('OK' if r.json().get('success') else 'FAIL')"
echo.

echo [Test 2] Getting Inventory...
python -c "import requests; r = requests.get('http://localhost:5001/api/tools/get_all_inventory'); print('Items:', r.json().get('count'))"
echo.

echo [Test 3] Getting Low Stock...
python -c "import requests; r = requests.get('http://localhost:5001/api/tools/get_low_stock_items'); print('Low Stock:', r.json().get('count'))"
echo.

echo [Test 4] Getting Optimal Supplier...
python -c "import requests; r = requests.get('http://localhost:5001/api/tools/get_optimal_supplier?name=Fresh%20Whole%20Milk'); d=r.json(); print('Best:', d.get('best_supplier'), '- RM', d.get('best_price_rm'))"
echo.

echo [Test 5] Getting Stock Summary...
python -c "import requests; r = requests.get('http://localhost:5001/api/tools/get_stock_summary'); d=r.json().get('data'); print('Health:', d.get('stock_health_percentage'), '%%')"
echo.

echo ============================================
echo All Tests Complete!
echo ============================================
pause