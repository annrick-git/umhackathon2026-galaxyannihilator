# StockMaster AI

AI-powered autonomous procurement agent for milk tea shops in Malaysia.

## Overview

StockMaster AI helps milk tea shop owners manage inventory and procurement through a conversational AI interface. It understands Manglish/Malay, analyzes fridge photos, compares supplier prices, and drafts WhatsApp orders.

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **AI**: Z.ai (Zhipu AI) GLM models via OpenAI-compatible API
- **Text Model**: `glm-5.1`
- **Vision Model**: `glm-4.5v`

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│  Chat Interface │────▶│   /api/chat      │
│  (text + image) │     │   AI Brain       │
└─────────────────┘     └────────┬────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ suppliers.json  │     │   Z.ai API      │     │ inventory.json  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
- Copy `.env.local` and update `ZAI_API_KEY` with your API key

3. Run development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Features

- **Conversational AI**: Chat about inventory needs in natural language
- **Image Analysis**: Upload fridge photos to detect low stock
- **Supplier Comparison**: Get best prices across multiple suppliers
- **WhatsApp Orders**: Draft and send orders via WhatsApp
- **Live Alerts**: Sidebar shows low-stock items in real-time

## API Endpoints

- `POST /api/chat` - AI chat endpoint
- `POST /api/analyze` - Image analysis
- `GET /api/inventory` - Get/update inventory
- `GET /api/suppliers` - Supplier data and price comparison