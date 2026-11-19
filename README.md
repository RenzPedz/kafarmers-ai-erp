# KaFarmers AI — Input Cost & Margin Mini-ERP

**Live App URL:** https://kafarmers-ai-mini-er-umy8.bolt.host

## Overview
KaFarmers AI is a browser-native Mini-ERP built for smallholder rice and corn farmers to prevent "input cost bleed." It tracks per-hectare expenses, calculates real-time break-even farmgate prices (PHP/kg), and uses client-side AI (`@huggingface/transformers`) to auto-categorize raw expense notes and audit farm margins—with zero external API keys required.

## Key Features
- **Plot & Yield Configuration:** Normalize input costs per hectare and calculate exact break-even PHP/kg.
- **In-Browser AI Expense Classifier:** Runs MobileBERT zero-shot classification locally in the browser to categorize expenses automatically.
- **AI Margin & Input Auditor:** Flags category overspending (e.g., Fertilizer > 35% of spend) and recommends actionable cost reductions.

## Tech Stack
- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **AI Layer:** Hugging Face Transformers.js (`Xenova/mobilebert-uncased-mnli`) + Agronomic Benchmark Engine
- **Testing & CI/CD:** Vitest, GitHub Actions, Vercel

## Local Setup & Testing
```bash
npm install
npx vitest run
npm run dev
