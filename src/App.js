import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE = 'http://localhost:5000/api';

const translations = {
  en: {
    dashboard: 'Dashboard', inventory: 'Inventory', gaps: 'Stock Gaps', orders: 'Orders', ai: 'AI Assistant', settings: 'Settings',
    totalItems: 'Total Items', stockGaps: 'Stock Gaps', activeOrders: 'Active Orders', totalSpent: 'Total Spent',
    criticalAlerts: 'Critical Stock Alerts', lowStock: 'Low Stock', inStock: 'In Stock', orderNow: 'Order Now',
    currentStock: 'Current Stock', minStock: 'Min Stock', status: 'Status', price: 'Price', supplier: 'Supplier',
    quantity: 'Quantity', totalCost: 'Total Cost', date: 'Date', gap: 'Gap', estCost: 'Est. Cost',
    aiAssistant: 'AI Brain - Natural Language Commands', askAi: 'Ask me to analyze gaps, compare prices, or place orders...', askAI: 'Ask AI',
    analyzeGaps: 'Analyze Stock Gaps', comparePrices: 'Compare Prices', optimizeCosts: 'Optimize Costs',
    aiResponse: 'AI Response', askQuestion: 'Ask a question above to get started', settingsTitle: 'Settings',
    agentPersonality: 'Agent Personality', personalityDesc: 'How the AI chat responds', language: 'Language',
    languageDesc: 'Preferred language for the interface', currency: 'Currency', currencyDesc: 'Display currency format',
    professional: 'Professional', casual: 'Casual', brief: 'Brief',
    optimizing: 'Optimizing for lowest cost across all suppliers...'
  },
  ms: {
    dashboard: 'Papan Pemuka', inventory: 'Inventori', gaps: 'Stok Rendah', orders: 'Pesanan', ai: 'Pembantu AI', settings: 'Tetapan',
    totalItems: 'Jumlah Item', stockGaps: 'Stok Rendah', activeOrders: 'Pesanan Aktif', totalSpent: 'Jumlah Belanja',
    criticalAlerts: 'Amaran Stok Kritikal', lowStock: 'Stok Rendah', inStock: 'Stok Mencukupi', orderNow: 'Pesan Sekarang',
    currentStock: 'Stok Semasa', minStock: 'Stok Minimum', status: 'Status', price: 'Harga', supplier: 'Pembekal',
    quantity: 'Kuantiti', totalCost: 'Jumlah Kos', date: 'Tarikh', gap: 'Kurangan', estCost: 'Kos Anggaran',
    aiAssistant: 'Otak AI - Arahan Bahasa Semulajadi', askAi: 'Tanya saya untuk analisis harga, atau pesan...', askAI: 'Tanya AI',
    analyzeGaps: 'Analisis Stok Rendah', comparePrices: 'Bandingkan Harga', optimizeCosts: 'Kos Optimize',
    aiResponse: 'Jawapan AI', askQuestion: 'Tanya soalan untuk mulakan', settingsTitle: 'Tetapan',
    agentPersonality: 'Personaliti Ejen', personalityDesc: 'Cara AI menjawab', language: 'Bahasa',
    languageDesc: 'Bahasa pilihan untuk antara muka', currency: 'Mata Wang', currencyDesc: 'Format paparan mata wang',
    professional: 'Profesional', casual: 'Bukan Rasmi', brief: 'Ringkas',
    optimizing: 'Mengoptimumkan kos terendah semua pembekal...'
  },
  zh: {
    dashboard: '仪表板', inventory: '库存', gaps: '缺货', orders: '订单', ai: 'AI助手', settings: '设置',
    totalItems: '总项目', stockGaps: '缺货项目', activeOrders: '活跃订单', totalSpent: '总消费',
    criticalAlerts: '库存警报', lowStock: '库存不足', inStock: '有库存', orderNow: '立即订购',
    currentStock: '当前库存', minStock: '最低库存', status: '状态', price: '价格', supplier: '供应商',
    quantity: '数量', totalCost: '总成本', date: '日期', gap: '缺口', estCost: '估计成本',
    aiAssistant: 'AI大脑 - 自然语言命令', askAi: '问我分析缺货、比较价格或下单...', askAI: '询问AI',
    analyzeGaps: '分析缺货', comparePrices: '比较价格', optimizeCosts: '优化成本',
    aiResponse: 'AI回复', askQuestion: '上面的问题开始', settingsTitle: '设置',
    agentPersonality: 'AI个性', personalityDesc: 'AI回复方式', language: '语言',
    languageDesc: '界面首选语言', currency: '货币', currencyDesc: '货币显示格式',
    professional: '专业', casual: '随意', brief: '简洁',
    optimizing: '优化所有供应商最低成本...'
  },
  ta: {
    dashboard: 'டாஷ்போர்டு', inventory: 'இன்வெண்டரி', gaps: 'பங்கு வேர்வை', orders: 'ஆர்டர்கள்', ai: 'AI உதவியாளர்', settings: 'அமைப்புகள்',
    totalItems: 'மொத்த பொருட்கள்', stockGaps: 'பங்கு வேர்வை', activeOrders: 'சுறுசுர்பு ஆர்டர்கள்', totalSpent: 'மொத்த செலவு',
    criticalAlerts: 'முக்கிய எச்சரிக்கைகள்', lowStock: 'குறைந்த பங்கு', inStock: 'போதிய பங்கு', orderNow: 'இப்போது ஆர்டர் செய்',
    currentStock: 'தற்போதைய பங்கு', minStock: 'குறைந்த பங்கு', status: 'நிலை', price: 'விலை', supplier: 'வழங்குநர்',
    quantity: 'அளவு', totalCost: 'மொத்த செலவு', date: 'தேதி', gap: 'பங்கு வேர்வை', estCost: 'மதிப்பிட்ட செலவு',
    aiAssistant: 'AI மூளை - இயல் மொழி கட்டளைகள்', askAi: 'பங்கு வேர்வை, விலைகள், ஆர்டர்கள் குறித்து கேள்...', askAI: 'AIஐ கேள்',
    analyzeGaps: 'பங்கு வேர்வை அறுவல்', comparePrices: 'விலைகள் ஒப்பிடு', optimizeCosts: 'செலவு மேம்படுத்து',
    aiResponse: 'AI பதில்', askQuestion: 'கேள்வி கேட்கத் தொடங்கு', settingsTitle: 'அமைப்புகள்',
    agentPersonality: 'முகவர் ஆளுமை', personalityDesc: 'AI எவ்வாறு பதிலளிக்கிறது', language: 'மொழி',
    languageDesc: 'விரும்பிய மொழி', currency: 'நாணயம்', currencyDesc: 'நாணய வடிவம்',
    professional: 'தொழில்முறை', casual: 'அளவு', brief: 'சுருக்கமான'
  }
};

const currencyConfigs = {
  RM: { symbol: 'RM', locale: 'ms-MY', rate: 1 },
  USD: { symbol: '$', locale: 'en-US', rate: 0.22 },
  EUR: { symbol: '€', locale: 'de-DE', rate: 0.20 },
  GBP: { symbol: '£', locale: 'en-GB', rate: 0.17 },
  INR: { symbol: '₹', locale: 'en-IN', rate: 18.5 },
  CNY: { symbol: '¥', locale: 'zh-CN', rate: 1.6 },
  JPY: { symbol: '¥', locale: 'ja-JP', rate: 33 }
};

function formatCurrency(amount, currency) {
  const config = currencyConfigs[currency] || currencyConfigs.RM;
  const converted = amount * config.rate;
  return new Intl.NumberFormat(config.locale, { style: 'currency', currency: config.symbol === 'RM' ? 'MYR' : config.symbol }).format(converted);
}

const personalityStyles = {
  professional: { prefix: 'Greetings. ', suffix: ' Please let me know if you require any additional assistance.', detail: 'high' },
  casual: { prefix: 'Hey there! ', suffix: ' Feel free to ask if you need anything else!', detail: 'medium' },
  brief: { prefix: '', suffix: '', detail: 'low' }
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [inventory, setInventory] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [personality, setPersonality] = useState('professional');
  const [language, setLanguage] = useState('en');
  const [currency, setCurrency] = useState('RM');
  const t = translations[language] || translations.en;

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
    const style = personalityStyles[personality];
    const msg = style.prefix + `Found ${gaps.length} items below minimum stock:` + '\n' + gaps.map(i => `• ${i.name}: ${i.current}/${i.min}`).join('\n') + style.suffix;
    setAiResponse(msg);
  };

  const comparePrices = async (itemName) => {
    const style = personalityStyles[personality];
    const priceComparisons = suppliers
      .flatMap(s => s.items.map(i => ({ ...i, supplier: s.name })))
      .filter(i => i.name.toLowerCase().includes(itemName.toLowerCase()))
      .sort((a, b) => a.price - b.price);
    
    if (priceComparisons.length > 0) {
      const best = priceComparisons[0];
      const msg = style.prefix + `Best price for ${itemName}:` + '\n' + priceComparisons.map(p => 
        `${p.supplier}: ${formatCurrency(p.price, currency)} ${p.unit}`
      ).join('\n') + '\n\nRecommended: ' + best.supplier + ' at ' + formatCurrency(best.price, currency) + style.suffix;
      setAiResponse(msg);
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
    const style = personalityStyles[personality];
    setAiResponse(style.prefix + `Order placed for ${gap.gap}x ${gap.item}` + '\nTotal: ' + formatCurrency(gap.estimatedCost, currency) + '\nStatus: Processing' + style.suffix);
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
      const style = personalityStyles[personality];
      setAiResponse(style.prefix + `I understood: "${aiPrompt}"` + '\n\nI can help with:' + '\n• "Show stock gaps" - Identify low inventory' + '\n• "Compare prices for [item]" - Find best supplier' + '\n• "Place order for [item]" - Auto-order supplies' + style.suffix);
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
        <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>{t.dashboard}</button>
        <button className={activeTab === 'inventory' ? 'active' : ''} onClick={() => setActiveTab('inventory')}>{t.inventory}</button>
        <button className={activeTab === 'gaps' ? 'active' : ''} onClick={() => setActiveTab('gaps')}>{t.gaps}</button>
        <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>{t.orders}</button>
        <button className={activeTab === 'ai' ? 'active' : ''} onClick={() => setActiveTab('ai')}>{t.ai}</button>
        <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>{t.settings}</button>
      </nav>

      <main className="content">
        {activeTab === 'dashboard' && (
          <div className="dashboard">
            <div className="stats-grid">
              <div className="stat-card">
                <h3>{t.totalItems}</h3>
                <p className="stat-value">{inventory.length}</p>
              </div>
              <div className="stat-card warning">
                <h3>{t.stockGaps}</h3>
                <p className="stat-value">{gaps.length}</p>
              </div>
              <div className="stat-card">
                <h3>{t.activeOrders}</h3>
                <p className="stat-value">{orders.filter(o => o.status !== 'Delivered').length}</p>
              </div>
              <div className="stat-card">
                <h3>{t.totalSpent}</h3>
                <p className="stat-value">{formatCurrency(orders.reduce((sum, o) => sum + o.totalCost, 0), currency)}</p>
              </div>
            </div>

            <div className="section">
              <h2>{t.criticalAlerts}</h2>
              <div className="alert-list">
                {gaps.map(gap => (
                  <div key={gap.id} className="alert-card">
                    <span className="alert-icon">⚠️</span>
                    <div>
                      <strong>{gap.item}</strong>
                      <p>Current: {gap.current} | Min: {gap.min} | Gap: {gap.gap}</p>
                    </div>
                    <button onClick={() => placeOrder(gap)}>{t.orderNow}</button>
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
                  <th>{t.currentStock}</th>
                  <th>{t.minStock}</th>
                  <th>{t.status}</th>
                  <th>{t.price}</th>
                  <th>{t.supplier}</th>
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
                        {item.currentStock < item.minStock ? t.lowStock : t.inStock}
                      </span>
                    </td>
                    <td>{formatCurrency(item.price, currency)}</td>
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
                    <p><strong>{t.gap}:</strong> {gap.gap} units</p>
                    <p><strong>{t.estCost}:</strong> {formatCurrency(gap.estimatedCost, currency)}</p>
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
                  <th>{t.quantity}</th>
                  <th>{t.supplier}</th>
                  <th>{t.totalCost}</th>
                  <th>{t.status}</th>
                  <th>{t.date}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td>{order.item}</td>
                    <td>{order.quantity}</td>
                    <td>{order.supplier}</td>
                    <td>{formatCurrency(order.totalCost, currency)}</td>
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
            <h2>{t.aiAssistant}</h2>
            <form onSubmit={handleAiSubmit} className="ai-form">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={t.askAi}
              />
              <button type="submit">{t.askAI}</button>
            </form>
            <div className="ai-quick-actions">
              <button onClick={analyzeGaps}>🔍 {t.analyzeGaps}</button>
              <button onClick={() => comparePrices('Tapioca Pearls')}>💰 {t.comparePrices}</button>
              <button onClick={() => setAiResponse(t.optimizing + '\n\nBest savings found:\n• Tapioca Pearls: Save ' + formatCurrency(12.50, currency) + ' by switching to Boba King\n• PET Cups: Save ' + formatCurrency(45.00, currency) + ' by bulk order')}>📊 {t.optimizeCosts}</button>
            </div>
            <div className="ai-response">
              <h3>{t.aiResponse}:</h3>
              <pre>{aiResponse || t.askQuestion}</pre>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-section">
            <h2>{t.settingsTitle}</h2>
            
            <div className="setting-group">
              <label>{t.agentPersonality}</label>
              <p className="setting-desc">{t.personalityDesc}</p>
              <select value={personality} onChange={(e) => setPersonality(e.target.value)}>
                <option value="professional">{t.professional}</option>
                <option value="casual">{t.casual}</option>
                <option value="brief">{t.brief}</option>
              </select>
            </div>

            <div className="setting-group">
              <label>{t.language}</label>
              <p className="setting-desc">{t.languageDesc}</p>
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="en">English</option>
                <option value="ms">Bahasa Melayu (Malay)</option>
                <option value="zh">中文 (Mandarin)</option>
                <option value="ta">தமிழ் (Tamil)</option>
              </select>
            </div>

            <div className="setting-group">
              <label>{t.currency}</label>
              <p className="setting-desc">{t.currencyDesc}</p>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="RM">RM - Malaysian Ringgit</option>
                <option value="USD">$ - US Dollar</option>
                <option value="EUR">€ - Euro</option>
                <option value="GBP">£ - British Pound</option>
                <option value="INR">₹ - Indian Rupee</option>
                <option value="CNY">¥ - Chinese Yuan</option>
                <option value="JPY">¥ - Japanese Yen</option>
              </select>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;