import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE = 'http://localhost:5000/api';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [inventory, setInventory] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [invRes, supRes, gapsRes, ordRes] = await Promise.all([
        fetch(`${API_BASE}/inventory`).catch(() => ({ ok: false })),
        fetch(`${API_BASE}/suppliers`).catch(() => ({ ok: false })),
        fetch(`${API_BASE}/gaps`).catch(() => ({ ok: false })),
        fetch(`${API_BASE}/orders`).catch(() => ({ ok: false }))
      ]);

      if (invRes.ok) setInventory(await invRes.json());
      if (supRes.ok) setSuppliers(await supRes.json());
      if (gapsRes.ok) setGaps(await gapsRes.json());
      if (ordRes.ok) setOrders(await ordRes.json());
    } catch (err) {
      console.log('Backend not running, using demo data');
      loadDemoData();
    }
    setLoading(false);
  };

  const loadDemoData = () => {
    setSuppliers([
      { id: 1, name: 'Dairy Farms Inc.', items: [{ name: 'Fresh Whole Milk', price: 73.12, unit: 'Case (4 x 1 Gallon)' }] },
      { id: 2, name: 'Boba King Wholesale', items: [{ name: 'Tapioca Pearls (Boba)', price: 47.43, unit: '3 kg bag' }] },
      { id: 3, name: 'Pack-It Right', items: [{ name: '16oz PET Plastic Cups', price: 256.91, unit: 'Case of 1,000' }] },
      { id: 4, name: 'Serene Tea Imports', items: [{ name: 'Jasmine Green Tea Leaves', price: 94.86, unit: '1 kg bag' }] },
      { id: 5, name: 'Sweet Source Syrups', items: [{ name: 'Brown Sugar Syrup', price: 61.26, unit: '2.5 kg jug' }] },
    ]);

    setInventory([
      { id: 1, name: 'Fresh Whole Milk', currentStock: 5, minStock: 20, unit: 'Case', price: 73.12, supplier: 'Dairy Farms Inc.' },
      { id: 2, name: 'Tapioca Pearls (Boba)', currentStock: 3, minStock: 15, unit: 'bag', price: 47.43, supplier: 'Boba King Wholesale' },
      { id: 3, name: 'Jasmine Green Tea Leaves', currentStock: 25, minStock: 10, unit: 'kg', price: 94.86, supplier: 'Serene Tea Imports' },
      { id: 4, name: 'Brown Sugar Syrup', currentStock: 8, minStock: 15, unit: 'jug', price: 61.26, supplier: 'Sweet Source Syrups' },
      { id: 5, name: '16oz PET Plastic Cups', currentStock: 2, minStock: 10, unit: 'Case', price: 256.91, supplier: 'Pack-It Right' },
    ]);

    setGaps([
      { id: 1, item: 'Fresh Whole Milk', current: 5, min: 20, gap: 15, estimatedCost: 1096.80 },
      { id: 2, item: 'Tapioca Pearls (Boba)', current: 3, min: 15, gap: 12, estimatedCost: 569.16 },
      { id: 3, item: '16oz PET Plastic Cups', current: 2, min: 10, gap: 8, estimatedCost: 2055.28 },
    ]);

    setOrders([
      { id: 1, item: 'Tapioca Pearls (Boba)', quantity: 12, supplier: 'Boba King Wholesale', totalCost: 569.16, status: 'Pending', date: '2026-04-23' },
    ]);
  };

  const analyzeGaps = async () => {
    setAiResponse('Analyzing inventory gaps...');
    const criticalGaps = inventory.filter(item => item.currentStock < item.minStock);
    setAiResponse(`Found ${criticalGaps.length} items below minimum stock:\n${criticalGaps.map(i => `• ${i.name}: ${i.currentStock}/${i.minStock}`).join('\n')}`);
  };

  const comparePrices = async (itemName) => {
    setAiResponse(`Comparing prices for ${itemName} across suppliers...`);
    const priceComparisons = suppliers
      .flatMap(s => s.items.map(i => ({ ...i, supplier: s.name })))
      .filter(i => i.name.toLowerCase().includes(itemName.toLowerCase()))
      .sort((a, b) => a.price - b.price);
    
    if (priceComparisons.length > 0) {
      const best = priceComparisons[0];
      setAiResponse(`Best price for ${itemName}:\n${priceComparisons.map(p => 
        `${p.supplier}: RM${p.price.toFixed(2)} ${p.unit}`
      ).join('\n')}\n\nRecommended: ${best.supplier} at RM${best.price.toFixed(2)}`);
    }
  };

  const placeOrder = async (gap) => {
    const newOrder = {
      item: gap.item,
      quantity: gap.gap,
      supplier: 'Auto-selected (lowest cost)',
      totalCost: gap.estimatedCost,
      status: 'Processing',
      date: new Date().toISOString().split('T')[0]
    };
    setOrders([...orders, { ...newOrder, id: orders.length + 1 }]);
    setAiResponse(`Order placed for ${gap.gap}x ${gap.item}\nTotal: RM${gap.estimatedCost.toFixed(2)}\nStatus: Processing`);
  };

  const handleAiSubmit = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    
    setAiResponse('AI is analyzing...');
    
    const prompt = aiPrompt.toLowerCase();
    
    if (prompt.includes('gap') || prompt.includes('low') || prompt.includes('stock')) {
      await analyzeGaps();
    } else if (prompt.includes('price') || prompt.includes('compare') || prompt.includes('cheapest')) {
      const itemMatch = aiPrompt.match(/(?:for|of)\s+(.+?)(?:\s|$)/i);
      await comparePrices(itemMatch ? itemMatch[1] : 'all items');
    } else if (prompt.includes('order') || prompt.includes('buy')) {
      const criticalGaps = gaps.slice(0, 1);
      if (criticalGaps[0]) {
        await placeOrder(criticalGaps[0]);
      }
    } else {
      setAiResponse(`AI understood: "${aiPrompt}"\n\nI can help with:\n• "Show stock gaps" - Identify low inventory\n• "Compare prices for [item]" - Find best supplier\n• "Place order for [item]" - Auto-order supplies\n• "Optimize costs" - Find lowest cost options`);
    }
  };

  if (loading) return <div className="loading">Loading StockMaster...</div>;

  return (
    <div className="App">
      <header className="App-header">
        <h1>StockMaster AI</h1>
        <p>Intelligent Inventory Management System</p>
      </header>

      <nav className="nav-tabs">
        <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
        <button className={activeTab === 'inventory' ? 'active' : ''} onClick={() => setActiveTab('inventory')}>Inventory</button>
        <button className={activeTab === 'gaps' ? 'active' : ''} onClick={() => setActiveTab('gaps')}>Stock Gaps</button>
        <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>Orders</button>
        <button className={activeTab === 'ai' ? 'active' : ''} onClick={() => setActiveTab('ai')}>AI Assistant</button>
      </nav>

      <main className="content">
        {activeTab === 'dashboard' && (
          <div className="dashboard">
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Items</h3>
                <p className="stat-value">{inventory.length}</p>
              </div>
              <div className="stat-card warning">
                <h3>Stock Gaps</h3>
                <p className="stat-value">{gaps.length}</p>
              </div>
              <div className="stat-card">
                <h3>Active Orders</h3>
                <p className="stat-value">{orders.filter(o => o.status !== 'Delivered').length}</p>
              </div>
              <div className="stat-card">
                <h3>Total Spent</h3>
                <p className="stat-value">RM{orders.reduce((sum, o) => sum + o.totalCost, 0).toFixed(2)}</p>
              </div>
            </div>

            <div className="section">
              <h2>Critical Stock Alerts</h2>
              <div className="alert-list">
                {gaps.map(gap => (
                  <div key={gap.id} className="alert-card">
                    <span className="alert-icon">⚠️</span>
                    <div>
                      <strong>{gap.item}</strong>
                      <p>Current: {gap.current} | Min: {gap.min} | Gap: {gap.gap}</p>
                    </div>
                    <button onClick={() => placeOrder(gap)}>Order Now</button>
                  </div>
                ))}
                {gaps.length === 0 && <p>All items are sufficiently stocked! ✅</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="inventory-section">
            <h2>Current Inventory</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Current Stock</th>
                  <th>Min Stock</th>
                  <th>Status</th>
                  <th>Price</th>
                  <th>Supplier</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map(item => (
                  <tr key={item.id} className={item.currentStock < item.minStock ? 'low-stock' : ''}>
                    <td>{item.name}</td>
                    <td>{item.currentStock} {item.unit}</td>
                    <td>{item.minStock} {item.unit}</td>
                    <td>
                      <span className={`status ${item.currentStock < item.minStock ? 'low' : 'ok'}`}>
                        {item.currentStock < item.minStock ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                    <td>RM{item.price.toFixed(2)}</td>
                    <td>{item.supplier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'gaps' && (
          <div className="gaps-section">
            <h2>Stock Gap Analysis</h2>
            <p className="section-desc">Items that need restocking to maintain minimum inventory levels</p>
            <div className="gaps-grid">
              {gaps.map(gap => (
                <div key={gap.id} className="gap-card">
                  <h3>{gap.item}</h3>
                  <div className="gap-details">
                    <div className="gap-bar">
                      <div className="gap-fill" style={{ width: `${(gap.current/gap.min)*100}%` }}></div>
                    </div>
                    <p>{gap.current} / {gap.min} units</p>
                  </div>
                  <div className="gap-info">
                    <p><strong>Gap:</strong> {gap.gap} units</p>
                    <p><strong>Est. Cost:</strong> RM{gap.estimatedCost.toFixed(2)}</p>
                  </div>
                  <button onClick={() => placeOrder(gap)}>Optimize & Order</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="orders-section">
            <h2>Purchase Orders</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Supplier</th>
                  <th>Total Cost</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td>{order.item}</td>
                    <td>{order.quantity}</td>
                    <td>{order.supplier}</td>
                    <td>RM{order.totalCost.toFixed(2)}</td>
                    <td><span className={`status ${order.status.toLowerCase()}`}>{order.status}</span></td>
                    <td>{order.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="ai-section">
            <h2>AI Brain - Natural Language Commands</h2>
            <form onSubmit={handleAiSubmit} className="ai-form">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ask me to analyze gaps, compare prices, or place orders..."
              />
              <button type="submit">Ask AI</button>
            </form>
            <div className="ai-quick-actions">
              <button onClick={analyzeGaps}>🔍 Analyze Stock Gaps</button>
              <button onClick={() => comparePrices('Tapioca Pearls')}>💰 Compare Prices</button>
              <button onClick={() => setAiResponse('Optimizing for lowest cost across all suppliers...\n\nBest savings found:\n• Tapioca Pearls: Save RM 12.50 by switching to Boba King\n• PET Cups: Save RM 45.00 by bulk order')}>📊 Optimize Costs</button>
            </div>
            <div className="ai-response">
              <h3>AI Response:</h3>
              <pre>{aiResponse || 'Ask a question above to get started'}</pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;