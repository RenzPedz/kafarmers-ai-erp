# System Architecture: KaFarmers AI (Zero-API Browser-Native)

[React / Vite + Tailwind UI]
       │
       ├──► Deterministic ERP Math Engine (src/lib/erpMath.ts)
       │         └──► Real-time Break-Even & Cost/Ha KPIs
       │
       ├──► In-Browser AI Engine (@huggingface/transformers + WASM)
       │         ├──► Zero-Shot Expense Classifier (MobileBERT)
       │         └──► Agronomic Margin & Input Ratio Auditor
       │
       └──► Browser LocalStorage (Persistent Farm Ledger)

## Security & Secrets
- Zero external LLM API keys are used or stored anywhere in the codebase or environment.