"use client"

import React from "react"
import { User } from "lucide-react"
import { StockAlertCard } from "./StockAlertCard"
import { SupplierComparisonCard } from "./SupplierComparisonCard"
import { OrderDraftCard } from "./OrderDraftCard"

interface Message {
  role: "user" | "assistant"
  content: string
  imageUrl?: string
}

interface ChatMessageProps {
  message: Message
  isLast?: boolean
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"

  const parseAIResponse = (content: string) => {
    if (!content) return { text: "Sorry, I couldn't get a response. Please try again.", stockAlert: null, supplierData: null, orderDraft: null }
    const stockAlertMatch = content.match(/\[STOCK_ALERT\]([\s\S]*?)\[\/STOCK_ALERT\]/)
    const supplierMatch = content.match(/\[SUPPLIER_COMPARISON\]([\s\S]*?)\[\/SUPPLIER_COMPARISON\]/)
    const orderMatch = content.match(/\[ORDER_DRAFT\]([\s\S]*?)\[\/ORDER_DRAFT\]/)

    let text = content
    let stockAlert: unknown = null
    let supplierData: unknown = null
    let orderDraft: unknown = null

    if (stockAlertMatch) {
      try {
        stockAlert = JSON.parse(stockAlertMatch[1])
      } catch {
        stockAlert = stockAlertMatch[1]
      }
      text = text.replace(stockAlertMatch[0], "")
    }

    if (supplierMatch) {
      try {
        supplierData = JSON.parse(supplierMatch[1])
      } catch {
        supplierData = supplierMatch[1]
      }
      text = text.replace(supplierMatch[0], "")
    }

    if (orderMatch) {
      try {
        orderDraft = JSON.parse(orderMatch[1])
      } catch {
        orderDraft = orderMatch[1]
      }
      text = text.replace(orderMatch[0], "")
    }

    return { text: text.trim(), stockAlert, supplierData, orderDraft }
  }

  if (isUser) {
    return (
      <div className="flex w-full justify-end gap-3 mb-6">
        <div className="bg-zinc-800 text-zinc-100 px-5 py-3 rounded-3xl rounded-tr-sm max-w-[80%] shadow-sm text-sm">
          {message.content}
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 flex-shrink-0">
          <User className="h-5 w-5 text-zinc-300" />
        </div>
      </div>
    )
  }

  const { text, stockAlert, supplierData, orderDraft } = parseAIResponse(message.content)

  return (
    <div className="flex gap-3 max-w-3xl">
      <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center">
        <svg className="w-4 h-4 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <div className="flex-1 space-y-3">
        {message.imageUrl && (
          <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={message.imageUrl} alt="Uploaded" className="max-w-xs rounded-lg" />
          </div>
        )}
        {text && (
          <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm text-sm text-foreground">
            {text}
          </div>
        )}
        {stockAlert !== null && stockAlert !== undefined && stockAlert !== false ? <StockAlertCard data={stockAlert as Record<string, unknown>} /> : null}
        {supplierData !== null && supplierData !== undefined && supplierData !== false ? <SupplierComparisonCard data={supplierData as Record<string, unknown>} /> : null}
        {orderDraft !== null && orderDraft !== undefined && orderDraft !== false ? <OrderDraftCard data={orderDraft as Record<string, unknown>} /> : null}
      </div>
    </div>
  )
}