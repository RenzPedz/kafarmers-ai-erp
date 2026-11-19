# KaFarmers AI — Input Cost & Margin Mini-ERP

**Live App URL:** https://kafarmers-ai-mini-er-umy8.bolt.host

## Overview
KaFarmers AI is a browser-native Mini-ERP built for smallholder rice and corn farmers to prevent "input cost bleed." It tracks per-hectare expenses, calculates real-time break-even farmgate prices (PHP/kg), and uses client-side AI (`@huggingface/transformers`) to auto-categorize raw expense notes and audit farm margins with zero external LLM API keys required.

## Key Features
- **Plot & Yield Configuration:** Normalize input costs per hectare and calculate exact break-even PHP/kg and projected net profit in real time.
- **In-Browser AI Expense Classifier:** Runs MobileBERT zero-shot classification (`Xenova/mobilebert-uncased-mnli`) locally in the browser to categorize raw expense notes automatically, with an instant keyword fallback.
- **AI Margin & Input Auditor:** Flags category overspending (e.g., Fertilizer > 35% of spend) against crop benchmarks and recommends actionable peso savings.
- **Persistent Farm Ledger:** Powered by Bolt Database so seasonal farm settings and expense records persist across reloads.

## Tech Stack
- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **AI Layer:** Hugging Face Transformers.js (`Xenova/mobilebert-uncased-mnli`) + Agronomic Benchmark Engine (Zero external API keys)
- **Database & Hosting:** Bolt Database & Bolt Cloud Hosting (`.bolt.host`) with built-in runtime logs and monitoring
- **Testing & CI/CD:** Vitest, GitHub Actions

## Local Setup & Testing
```bash
npm install
npx vitest run
npm run dev
