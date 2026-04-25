"use client"

import { useState, useEffect, useRef } from "react"
import { ChatMessage } from "@/components/chat/ChatMessage"
import { TypingIndicator } from "@/components/chat/TypingIndicator"
import { ImageUpload } from "@/components/chat/ImageUpload"
import { VoiceInput } from "@/components/chat/VoiceInput"
import { QuickStats } from "@/components/dashboard/QuickStats"

interface Message {
  role: "user" | "assistant"
  content: string
  imageUrl?: string
}

interface InventoryItem {
  id: string
  name: string
  category: string
  currentStock: number
  minStock: number
  unit: string
}

export default function StockMasterDashboard() {
  const [showStartup, setShowStartup] = useState<boolean | "animating">(true)
  const [showLogin, setShowLogin] = useState(true)
  const [loginForm, setLoginForm] = useState({ username: "", password: "" })
  const [loginError, setLoginError] = useState("")
  const [userName, setUserName] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi Boss, what do we need to restock today?" }
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeView, setActiveView] = useState<"dashboard" | "inventory" | "suppliers" | "settings" | "prices">("dashboard")
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([])
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editQuantity, setEditQuantity] = useState("")
  const [suppliersData, setSuppliersData] = useState<{ name: string; items: { name: string; unit: string; priceRM: number }[] }[]>([])
  const [selectedSupplierItem, setSelectedSupplierItem] = useState<string>("")
  const [selectedSupplier, setSelectedSupplier] = useState<string>("")
  const [orderQuantity, setOrderQuantity] = useState<number>(1)
  const [supplierDebt, setSupplierDebt] = useState<{ total_debt_rm: number; debts: { supplier_name: string; amount_owed: number }[] }>({ total_debt_rm: 0, debts: [] })
  const [showRepayModal, setShowRepayModal] = useState<boolean>(false)
  const [repaySupplier, setRepaySupplier] = useState<string>("")
  const [repayAmount, setRepayAmount] = useState<string>("")
  const [repayMethod, setRepayMethod] = useState<"qr" | "card">("qr")
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null)
  const [exportType, setExportType] = useState<"csv" | "excel" | "txt">("csv")
  const [unitSystem, setUnitSystem] = useState<"original" | "metric" | "imperial" | "si">("original")
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium")
  const [priceItems, setPriceItems] = useState<string[]>([])
  const [selectedPriceItem, setSelectedPriceItem] = useState<string>("")
  const [priceRange, setPriceRange] = useState<"hour" | "day" | "month">("day")
  const [priceHistory, setPriceHistory] = useState<{timestamp: string; price: number}[]>([])

  useEffect(() => {
    fetchInventory()
    fetchSuppliers()
  }, [])

  useEffect(() => {
    if (suppliersData.length > 0) {
      fetchPriceHistory()
    }
  }, [suppliersData])

  useEffect(() => {
    if (selectedPriceItem) {
      fetchPriceForItem()
    }
  }, [selectedPriceItem, priceRange])

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark")
    document.documentElement.classList.add(theme)
    const sizes = { small: "14px", medium: "16px", large: "18px" }
    document.documentElement.style.fontSize = sizes[fontSize]
  }, [theme, fontSize])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function fetchInventory() {
    try {
      const res = await fetch("/api/inventory")
      const data = await res.json()
      const items = data.items || []
      setAllInventory(items)
      const lowItems = items.filter((item: InventoryItem) => item.currentStock < item.minStock)
      setLowStockItems(lowItems)
    } catch (error) {
      console.error("Failed to fetch inventory:", error)
    }
  }

  function convertUnit(value: number, unit: string, system: "original" | "metric" | "imperial" | "si"): string {
    if (system === "original") return `${value} ${unit}`
    
    const unitLower = unit.toLowerCase()
    const conversions: Record<string, { metric: number; imperial: number; si: number }> = {
      "case": { metric: 1, imperial: 1, si: 1 },
      "3kg bag": { metric: 3, imperial: 6.61, si: 3 },
      "1 kg bag": { metric: 1, imperial: 2.2, si: 1 },
      "2.5 kg jug": { metric: 2.5, imperial: 5.51, si: 2.5 },
      "5 gallon pail": { metric: 18.93, imperial: 5, si: 18.93 },
      "50 lb sack": { metric: 22.68, imperial: 50, si: 22.68 },
      "case (12 x 1 liter)": { metric: 12, imperial: 3.17, si: 12 },
      "500g pouch": { metric: 0.5, imperial: 1.1, si: 0.5 },
      "3.8 kg jar": { metric: 3.8, imperial: 8.38, si: 3.8 },
      "3.2 kg tub": { metric: 3.2, imperial: 7.05, si: 3.2 },
      "1 gallon jug": { metric: 3.79, imperial: 1, si: 3.79 },
      "1 unit": { metric: 1, imperial: 1, si: 1 },
      "2 kg bottle": { metric: 2, imperial: 4.41, si: 2 },
      "carton (48 x 400g tins)": { metric: 19.2, imperial: 42.33, si: 19.2 },
    }
    
    const conv = conversions[unitLower]
    if (!conv) return `${value} ${unit}`
    
    let converted: number
    switch (system) {
      case "metric": converted = value * conv.metric; break
      case "imperial": converted = value * conv.imperial; break
      case "si": converted = value * conv.si; break
      default: return `${value} ${unit}`
    }
    
    const unitNames: Record<string, Record<string, string>> = {
      "metric": { "case": "units", "3kg bag": "kg", "1 kg bag": "kg", "2.5 kg jug": "L", "5 gallon pail": "L", "50 lb sack": "kg", "case (12 x 1 liter)": "L", "500g pouch": "kg", "3.8 kg jar": "kg", "3.2 kg tub": "kg", "1 gallon jug": "L", "1 unit": "units", "2 kg bottle": "L", "carton (48 x 400g tins)": "kg" },
      "imperial": { "case": "units", "3kg bag": "lb", "1 kg bag": "lb", "2.5 kg jug": "gal", "5 gallon pail": "gal", "50 lb sack": "lb", "case (12 x 1 liter)": "gal", "500g pouch": "lb", "3.8 kg jar": "lb", "3.2 kg tub": "lb", "1 gallon jug": "gal", "1 unit": "units", "2 kg bottle": "gal", "carton (48 x 400g tins)": "lb" },
      "si": { "case": "units", "3kg bag": "kg", "1 kg bag": "kg", "2.5 kg jug": "kg", "5 gallon pail": "L", "50 lb sack": "kg", "case (12 x 1 liter)": "L", "500g pouch": "g", "3.8 kg jar": "kg", "3.2 kg tub": "kg", "1 gallon jug": "L", "1 unit": "units", "2 kg bottle": "kg", "carton (48 x 400g tins)": "kg" },
    }
    
    const newUnit = unitNames[system]?.[unitLower] || unit
    return `${converted.toFixed(2)} ${newUnit}`
  }

  async function fetchSuppliers() {
    try {
      const res = await fetch("/api/suppliers")
      const data = await res.json()
      setSuppliersData(data.suppliers || [])
      
      try {
        const debtRes = await fetch("http://localhost:5001/api/tools/get_supplier_debt_summary")
        if (debtRes.ok) {
          const debtData = await debtRes.json()
          if (debtData.success) {
            setSupplierDebt({ total_debt_rm: debtData.total_debt_rm || 0, debts: debtData.debts || [] })
          }
        }
      } catch {}
    } catch (error) {
      console.error("Failed to fetch suppliers:", error)
    }
  }

  async function fetchPriceHistory() {
    try {
      const res = await fetch("http://localhost:5001/api/tools/get_all_price_history")
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setPriceItems(data.items || [])
          return
        }
      }
    } catch {}
    // Fallback: get from suppliers
    const items = suppliersData.flatMap(s => s.items).map(i => i.name).filter((v, idx, arr) => arr.indexOf(v) === idx)
    setPriceItems(items)
  }

  async function fetchPriceForItem() {
    if (!selectedPriceItem) return
    try {
      const res = await fetch(`http://localhost:5001/api/tools/get_price_history?item_name=${encodeURIComponent(selectedPriceItem)}&range=${priceRange}`)
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setPriceHistory(data.prices || [])
          return
        }
      }
    } catch {}
    // Fallback: show supplier prices
    const allItems = suppliersData.flatMap(s => s.items)
    const mockPrices = allItems.filter(i => i.name === selectedPriceItem).map(i => ({
      timestamp: new Date().toISOString(),
      price: i.priceRM
    }))
    setPriceHistory(mockPrices)
  }

  async function fetchDebt() {
    try {
      const debtRes = await fetch("http://localhost:5001/api/tools/get_supplier_debt_summary")
      if (!debtRes.ok) return
      const debtData = await debtRes.json()
      if (debtData.success) {
        setSupplierDebt({ total_debt_rm: debtData.total_debt_rm || 0, debts: debtData.debts || [] })
      }
    } catch (error) {
      console.error("Failed to fetch debt:", error)
    }
  }

  const updateStock = async (id: string, action: "increase" | "decrease", quantity: number) => {
    try {
      const res = await fetch("/api/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, quantity, action })
      })
      const data = await res.json()
      if (data.success || data.data) {
        await fetchInventory()
        setEditingItem(null)
        setEditQuantity("")
      }
    } catch (error) {
      console.error("Failed to update stock:", error)
    }
  }

  const handleExport = () => {
    const headers = ["Item", "Category", "Current Stock", "Min Stock", "Unit", "Status"]
    const rows = allInventory.map(item => [
      item.name,
      item.category,
      unitSystem === "original" ? item.currentStock : convertUnit(item.currentStock, item.unit, unitSystem).split(" ")[0],
      unitSystem === "original" ? item.minStock : convertUnit(item.minStock, item.unit, unitSystem).split(" ")[0],
      unitSystem === "original" ? item.unit : convertUnit(item.currentStock, item.unit, unitSystem).split(" ").slice(1).join(" "),
      item.currentStock < item.minStock ? "Low Stock" : "In Stock"
    ])

    let content: string
    let mimeType: string
    let extension: string

    if (exportType === "txt") {
      const lines = [headers.join("\t"), ...rows.map(r => r.join("\t"))]
      content = lines.join("\n")
      mimeType = "text/plain"
      extension = "txt"
    } else if (exportType === "excel") {
      const lines = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))]
      content = lines.join("\n")
      mimeType = "application/vnd.ms-excel"
      extension = "csv"
    } else {
      const lines = [headers.join(","), ...rows.map(r => r.join(","))]
      content = lines.join("\n")
      mimeType = "text/csv"
      extension = "csv"
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `inventory_export_${new Date().toISOString().split("T")[0]}.${extension}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleQuickUpdate = (id: string, action: "increase" | "decrease") => {
    const qty = parseInt(editQuantity) || 1
    updateStock(id, action, qty)
  }

  const sendMessage = async (content: string, imageUrl?: string) => {
    const userMessage: Message = { role: "user", content, imageUrl }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          conversationHistory: messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
        })
      })
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`)
      }
      const data = await res.json()
      setMessages(prev => [...prev, { role: "assistant", content: data.response }])
      
      // Refresh inventory after agent response (in case tool was used)
      await fetchInventory()
    } catch (error) {
      console.error("Chat error:", error)
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry Boss, something went wrong. Please try again." }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return
    sendMessage(inputValue)
    setInputValue("")
  }

  const handleImageUpload = async (file: File) => {
    setIsLoading(true)
    const formData = new FormData()
    formData.append("image", file)

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData
      })
      const data = await res.json()
      setMessages(prev => [...prev, { 
        role: "user", 
        content: "Analyzing this image...",
        imageUrl: URL.createObjectURL(file)
      }])
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: data.analysis || "I analyzed the image but couldn't detect any items. Please try again." 
      }])
    } catch (error) {
      console.error("Analyze error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNavClick = (view: "dashboard" | "inventory" | "suppliers" | "settings" | "prices") => {
    setActiveView(view)
    if (view === "inventory") {
      fetchInventory()
    }
  }

  useEffect(() => {
    if (!showStartup) return
    const handleLogin = (e: React.FormEvent) => {
      e.preventDefault()
      if (loginForm.username || loginForm.password) {
        setShowStartup("animating")
        setShowLogin(false)
        setTimeout(() => setShowStartup(false), 1200)
      }
    }
    if (!showLogin && !showStartup) return
  }, [showStartup, showLogin, loginForm])

  if (showStartup === "animating") {
    const spinKeyframes = `
      @keyframes spinGrow {
        0% { transform: rotate(0deg) scale(1); opacity: 1; }
        70% { transform: rotate(180deg) scale(5); opacity: 0.8; }
        100% { transform: rotate(360deg) scale(50); opacity: 0; }
      }
    `
    return (
      <>
        <style>{spinKeyframes}</style>
        <div className="flex h-screen bg-zinc-950 items-center justify-center overflow-hidden">
          <div 
            className="w-24 h-24 rounded-2xl bg-primary/20 flex items-center justify-center"
            style={{ animation: "spinGrow 1.2s ease-in forwards" }}
          >
            <svg className="w-16 h-16 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        </div>
      </>
    )
  }

  if (showStartup === true || showLogin) {
    return (
      <div className="flex h-screen bg-zinc-950 items-center justify-center">
        <div className="w-full max-w-md p-8 space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/20 flex items-center justify-center">
              <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground mt-4">StockMaster AI</h1>
          </div>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault()
            setLoginError("")
            if (!loginForm.username && !loginForm.password) {
              setLoginError("Please fill in both username and password")
              return
            }
            if (!loginForm.username) {
              setLoginError("Please Enter Your Username")
              return
            }
            if (!loginForm.password) {
              setLoginError("Please Enter Your Password")
              return
            }
            setUserName(loginForm.username)
            setShowStartup("animating")
            setShowLogin(false)
            setMessages([{ role: "assistant", content: `Welcome ${loginForm.username}! Hi Boss, what do we need to restock today?` }])
            setTimeout(() => setShowStartup(false), 1200)
          }}>
            {loginError && (
              <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-sm text-destructive">{loginError}</p>
              </div>
            )}
            <div>
              <input
                type="text"
                placeholder="Username"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-muted/30">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-zinc-950/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-72 bg-card border-r border-border
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        flex flex-col
      `}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h1 className="font-semibold text-foreground">StockMaster AI</h1>
              <p className="text-xs text-muted-foreground">Inventory Assistant</p>
            </div>
          </div>
        </div>

        <nav className="p-3 flex-1">
          <ul className="space-y-1">
            <li>
              <button onClick={() => handleNavClick("dashboard")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeView === "dashboard" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Dashboard
              </button>
            </li>
            <li>
              <button onClick={() => handleNavClick("inventory")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeView === "inventory" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Inventory
              </button>
            </li>
            <li>
              <button onClick={() => handleNavClick("suppliers")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeView === "suppliers" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Suppliers
              </button>
            </li>
            <li>
              <button onClick={() => handleNavClick("settings")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeView === "settings" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </button>
            </li>
            <li>
              <button onClick={() => handleNavClick("prices")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeView === "prices" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Prices
              </button>
            </li>
          </ul>
        </nav>

        <div className="p-3 border-t border-border">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm font-medium text-foreground">Low Stock Alerts</span>
            </div>
            <ul className="space-y-2">
              {lowStockItems.length === 0 ? (
                <li className="text-sm text-muted-foreground">All items stocked!</li>
              ) : (
                lowStockItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground truncate">{item.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                      {item.currentStock} left
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center gap-3 p-4 bg-card border-b border-border">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="font-semibold text-foreground">StockMaster AI</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {activeView === "inventory" ? (
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-foreground">Inventory</h2>
                <div className="flex items-center gap-3">
                  <select
                    value={unitSystem}
                    onChange={(e) => setUnitSystem(e.target.value as "original" | "metric" | "imperial" | "si")}
                    className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                  >
                    <option value="original">Original Units</option>
                    <option value="metric">Metric (kg/L)</option>
                    <option value="imperial">Imperial (lb/oz)</option>
                    <option value="si">SI (g/mL)</option>
                  </select>
                  <select
                    value={exportType}
                    onChange={(e) => setExportType(e.target.value as "csv" | "excel" | "txt")}
                    className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                  >
                    <option value="csv">CSV</option>
                    <option value="excel">Excel</option>
                    <option value="txt">TXT</option>
                  </select>
                  <button
                    onClick={handleExport}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    Export
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Item</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Category</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Current Stock</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Min Stock</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Status</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allInventory.map((item) => (
                      <tr key={item.id} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-3 px-4 text-foreground">{item.name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{item.category}</td>
                        <td className="py-3 px-4 text-foreground">{unitSystem === "original" ? `${item.currentStock} ${item.unit}` : convertUnit(item.currentStock, item.unit, unitSystem)}</td>
                        <td className="py-3 px-4 text-muted-foreground">{unitSystem === "original" ? `${item.minStock} ${item.unit}` : convertUnit(item.minStock, item.unit, unitSystem)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.currentStock < item.minStock ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-500"}`}>
                            {item.currentStock < item.minStock ? "Low Stock" : "In Stock"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {editingItem === item.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="1"
                                value={editQuantity}
                                onChange={(e) => setEditQuantity(e.target.value)}
                                placeholder="Qty"
                                className="w-16 px-2 py-1 text-sm bg-muted border border-border rounded"
                              />
                              <button
                                onClick={() => handleQuickUpdate(item.id, "increase")}
                                className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                                title="Increase stock"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleQuickUpdate(item.id, "decrease")}
                                className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                                title="Decrease stock"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                              </button>
                              <button
                                onClick={() => { setEditingItem(null); setEditQuantity("") }}
                                className="p-1 bg-muted text-muted-foreground rounded hover:bg-muted-foreground hover:text-foreground"
                                title="Cancel"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingItem(item.id)}
                              className="text-xs px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeView === "suppliers" ? (
            <div className="space-y-4">
              {supplierDebt.total_debt_rm > 0 && (
                <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-destructive">Total Amount Owed to Suppliers</p>
                      <p className="text-2xl font-bold text-destructive">RM {supplierDebt.total_debt_rm.toFixed(2)}</p>
                    </div>
                    <button
                      onClick={() => setShowRepayModal(true)}
                      className="px-4 py-2 bg-destructive text-white rounded-lg hover:bg-destructive/90"
                    >
                      Repay
                    </button>
                  </div>
                  <div className="mt-3 space-y-1">
                    {supplierDebt.debts.filter(d => d.amount_owed > 0).map(d => (
                      <div key={d.supplier_name} className="flex justify-between text-sm">
                        <span className="text-foreground">{d.supplier_name}</span>
                        <span className="text-destructive font-medium">RM {d.amount_owed.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">Supplier Prices</h2>
                <p className="text-sm text-muted-foreground mb-4">Compare prices across suppliers. Best prices are highlighted with a star.</p>
                {suppliersData.map((supplier) => (
                  <div key={supplier.name} className="mb-6">
                    <h3 className="text-lg font-medium text-foreground mb-3 flex items-center gap-2">
                      {supplier.name}
                    </h3>
                    <div className="grid gap-2">
                      {supplier.items.map((item, idx) => {
                        const itemName = item.name.toLowerCase()
                        const allPricesForItem = suppliersData.flatMap(s => s.items.filter(i => i.name.toLowerCase() === itemName)).map(i => i.priceRM)
                        const isBestPrice = item.priceRM === Math.min(...allPricesForItem)
                        return (
                          <div key={`${supplier.name}-${item.name}-${idx}`} className={`flex items-center justify-between p-3 rounded-lg border ${isBestPrice ? "border-green-500 bg-green-500/5" : "border-border bg-muted/30"}`}>
                            <div>
                              <p className="font-medium text-foreground">{item.name}</p>
                              <p className="text-sm text-muted-foreground">{item.unit}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-foreground">RM {item.priceRM.toFixed(2)}</p>
                              {isBestPrice && <span className="text-xs text-green-500">★ Best Price</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">Request Order</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Select Supplier</label>
                    <select
                      value={selectedSupplier}
                      onChange={(e) => setSelectedSupplier(e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground"
                    >
                      <option value="">Choose a supplier...</option>
                      {suppliersData.map(s => (
                        <option key={s.name} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Select Item</label>
                    <select
                      value={selectedSupplierItem}
                      onChange={(e) => setSelectedSupplierItem(e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground"
                    >
                      <option value="">Choose an item...</option>
                      {(selectedSupplier ? suppliersData.find(s => s.name === selectedSupplier)?.items || [] : suppliersData.flatMap(s => s.items)).map((item, idx) => (
                        <option key={`${item.name}-${idx}`} value={item.name}>{item.name} - RM {item.priceRM.toFixed(2)} ({item.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={orderQuantity}
                      onChange={(e) => setOrderQuantity(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground"
                    />
                  </div>
                  {selectedSupplierItem && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Estimated Total:</p>
                      <p className="text-2xl font-bold text-foreground">
                        RM {((suppliersData.flatMap(s => s.items).find(i => i.name === selectedSupplierItem)?.priceRM || 0) * orderQuantity).toFixed(2)}
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={!selectedSupplier || !selectedSupplierItem}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                    onClick={async () => {
                      if (!selectedSupplier || !selectedSupplierItem) return
                      const item = suppliersData.flatMap(s => s.items).find(i => i.name === selectedSupplierItem)
                      if (item) {
                        try {
                          const res = await fetch("http://localhost:5001/api/tools/create_supplier_order", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              item_name: item.name,
                              supplier_name: selectedSupplier,
                              quantity: orderQuantity,
                              unit_price: item.priceRM
                            })
                          })
                          const data = await res.json()
                          if (data.success) {
                            setOrderSuccess(`Order placed! ${orderQuantity}x ${item.name} added to inventory. Amount owed: RM ${(item.priceRM * orderQuantity).toFixed(2)}`)
                            setSelectedSupplierItem("")
                            setSelectedSupplier("")
                            setOrderQuantity(1)
                            fetchSuppliers()
                            fetchInventory()
                          } else {
                            setOrderSuccess(`Error: ${data.error}`)
                          }
                        } catch (error) {
                            console.error("Order error:", error)
                            setOrderSuccess("Failed to create order. Make sure backend is running.")
                          }
                      }
                    }}
                  >
                    Create Order
                  </button>
                  {orderSuccess && (
                    <div className="p-3 bg-green-500/10 border border-green-500 rounded-lg">
                      <p className="text-sm text-green-500">{orderSuccess}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : activeView === "settings" ? (
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6">Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Theme</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setTheme("dark")}
                      className={`flex-1 py-3 rounded-lg border ${theme === "dark" ? "bg-primary border-primary text-primary-foreground" : "border-border text-foreground"}`}
                    >
                      Dark
                    </button>
                    <button
                      onClick={() => setTheme("light")}
                      className={`flex-1 py-3 rounded-lg border ${theme === "light" ? "bg-primary border-primary text-primary-foreground" : "border-border text-foreground"}`}
                    >
                      Light
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Font Size</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setFontSize("small")}
                      className={`flex-1 py-3 rounded-lg border ${fontSize === "small" ? "bg-primary border-primary text-primary-foreground" : "border-border text-foreground"}`}
                    >
                      Small
                    </button>
                    <button
                      onClick={() => setFontSize("medium")}
                      className={`flex-1 py-3 rounded-lg border ${fontSize === "medium" ? "bg-primary border-primary text-primary-foreground" : "border-border text-foreground"}`}
                    >
                      Medium
                    </button>
                    <button
                      onClick={() => setFontSize("large")}
                      className={`flex-1 py-3 rounded-lg border ${fontSize === "large" ? "bg-primary border-primary text-primary-foreground" : "border-border text-foreground"}`}
                    >
                      Large
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : activeView === "prices" ? (
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Price Tracker</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Select Item</label>
                  <select
                    value={selectedPriceItem}
                    onChange={(e) => setSelectedPriceItem(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground"
                  >
                    <option value="">Choose an item...</option>
                    {priceItems.map(item => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Time Range</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setPriceRange("hour")}
                      className={`flex-1 py-2 rounded-lg border ${priceRange === "hour" ? "bg-primary border-primary text-primary-foreground" : "border-border text-foreground"}`}
                    >
                      Hour
                    </button>
                    <button
                      onClick={() => setPriceRange("day")}
                      className={`flex-1 py-2 rounded-lg border ${priceRange === "day" ? "bg-primary border-primary text-primary-foreground" : "border-border text-foreground"}`}
                    >
                      Day
                    </button>
                    <button
                      onClick={() => setPriceRange("month")}
                      className={`flex-1 py-2 rounded-lg border ${priceRange === "month" ? "bg-primary border-primary text-primary-foreground" : "border-border text-foreground"}`}
                    >
                      Month
                    </button>
                  </div>
                </div>
              </div>
              
              {priceHistory.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-foreground">{selectedPriceItem} - {priceRange}</h3>
                  <div className="h-64 border border-border rounded-lg p-4 overflow-y-auto">
                    {priceHistory.map((point, idx) => (
                      <div key={idx} className="flex justify-between text-sm py-1 border-b border-border/30">
                        <span className="text-muted-foreground">{new Date(point.timestamp).toLocaleString()}</span>
                        <span className="text-foreground font-medium">RM {point.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <QuickStats />
              {messages.map((message, index) => (
                <ChatMessage 
                  key={index} 
                  message={message} 
                  isLast={index === messages.length - 1 && message.role === "assistant"} 
                />
              ))}
              {isLoading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="p-4 border-t border-border bg-card">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="flex items-center gap-3 bg-muted/50 rounded-xl p-2">
              <VoiceInput onTranscript={(text) => setInputValue(prev => prev ? prev + " " + text : text)} disabled={isLoading} />
              <ImageUpload onUpload={handleImageUpload} disabled={isLoading} />
              <input
                type="text"
                placeholder="Type a message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
                className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
              />
              <button 
                type="submit" 
                disabled={isLoading || !inputValue.trim()}
                className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </div>

        {showRepayModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-lg border border-border p-6 max-w-md w-full">
              <h3 className="text-xl font-semibold text-foreground mb-4">Repay Supplier Debt</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Select Supplier</label>
                  <select
                    value={repaySupplier}
                    onChange={(e) => {
                      setRepaySupplier(e.target.value)
                      const debt = supplierDebt.debts.find(d => d.supplier_name === e.target.value)
                      setRepayAmount(debt?.amount_owed.toString() || "")
                    }}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground"
                  >
                    <option value="">Choose a supplier...</option>
                    {supplierDebt.debts.filter(d => d.amount_owed > 0).map((d, idx) => (
                      <option key={`${d.supplier_name}-${idx}`} value={d.supplier_name}>{d.supplier_name} - RM {d.amount_owed.toFixed(2)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Amount to Repay (RM)</label>
                  <input
                    type="number"
                    value={repayAmount}
                    onChange={(e) => setRepayAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Payment Method</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setRepayMethod("qr")}
                      className={`flex-1 py-3 rounded-lg border ${repayMethod === "qr" ? "bg-primary border-primary text-primary-foreground" : "border-border text-foreground"}`}
                    >
                      QR Payment
                    </button>
                    <button
                      type="button"
                      onClick={() => setRepayMethod("card")}
                      className={`flex-1 py-3 rounded-lg border ${repayMethod === "card" ? "bg-primary border-primary text-primary-foreground" : "border-border text-foreground"}`}
                    >
                      Debit/Credit Card
                    </button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowRepayModal(false)
                      setRepaySupplier("")
                      setRepayAmount("")
                    }}
                    className="flex-1 py-2 bg-muted text-foreground rounded-lg hover:bg-muted-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!repaySupplier || !repayAmount) return
                      try {
                        const res = await fetch("http://localhost:5001/api/tools/repay_supplier_debt", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            supplier_name: repaySupplier,
                            amount: parseFloat(repayAmount),
                            payment_method: repayMethod
                          })
                        })
                        const data = await res.json()
                        if (data.success) {
                          alert(`Repayment successful! Remaining debt: RM ${data.remaining_debt.toFixed(2)}`)
                          setShowRepayModal(false)
                          setRepaySupplier("")
                          setRepayAmount("")
                          fetchSuppliers()
                        } else {
                          alert(`Error: ${data.error}`)
                        }
                      } catch (error) {
                        alert("Failed to process repayment. Make sure backend is running.")
                      }
                    }}
                    className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    Repay
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}