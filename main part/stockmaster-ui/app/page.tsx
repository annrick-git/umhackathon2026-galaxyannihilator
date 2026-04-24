"use client"

import { useState, useEffect, useRef } from "react"
import { ChatMessage } from "@/components/chat/ChatMessage"
import { TypingIndicator } from "@/components/chat/TypingIndicator"
import { ImageUpload } from "@/components/chat/ImageUpload"
import { VoiceInput } from "@/components/chat/VoiceInput"
import { QuickStats } from "@/components/chat/QuickStats"

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
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi Boss, what do we need to restock today?" }
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeView, setActiveView] = useState<"dashboard" | "inventory">("dashboard")
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([])
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchInventory()
  }, [])

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
      const data = await res.json()
      setMessages(prev => [...prev, { role: "assistant", content: data.response }])
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

  const handleNavClick = (view: "dashboard" | "inventory") => {
    setActiveView(view)
    if (view === "inventory") {
      fetchInventory()
    }
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
              <h2 className="text-xl font-semibold text-foreground mb-4">Inventory</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Item</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Category</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Current Stock</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Min Stock</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allInventory.map((item) => (
                      <tr key={item.id} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-3 px-4 text-foreground">{item.name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{item.category}</td>
                        <td className="py-3 px-4 text-foreground">{item.currentStock} {item.unit}</td>
                        <td className="py-3 px-4 text-muted-foreground">{item.minStock} {item.unit}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.currentStock < item.minStock ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-500"}`}>
                            {item.currentStock < item.minStock ? "Low Stock" : "In Stock"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <>
              <QuickStats items={allInventory} />
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
              <VoiceInput onTranscribe={(text) => setInputValue(prev => prev + " " + text)} disabled={isLoading} />
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
      </main>
    </div>
  )
}