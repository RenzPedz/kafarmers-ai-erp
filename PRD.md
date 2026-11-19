# PRD: KaFarmers AI — Input Cost & Margin Mini-ERP

## 1. Problem Statement
Smallholder crop farmers track input expenses manually, leaving them blind to cost-per-hectare overruns and exact break-even farmgate prices until harvest is already over.

## 2. Target Persona
- **Primary User:** Multi-plot farm operator / agri-entrepreneur (managing 2–15 hectares).
- **Goal:** Keep per-hectare input costs within benchmark ratios and know exact break-even PHP/kg before negotiating with palay/corn traders.

## 3. Core User Stories
- As a farmer, I want to configure my plot size (hectares), expected yield (kg), and target selling price so KPIs update automatically.
- As a farmer, I want to type a plain-text expense note and have an in-browser AI model automatically classify its ERP ledger category.
- As a farmer, I want an AI Margin Audit that flags overspending by category and recommends concrete input savings.

## 4. Functional Scope (MVP)
- **In-Scope:** Plot setup bar, Expense CRUD ledger with AI auto-classification, KPI dashboard (Total Spend, Cost/Ha, Break-Even PHP/kg, Net Profit), and AI Margin Auditor.
- **Out-of-Scope (v1):** External paid LLM APIs, payment processing, multi-user payroll.

## 5. AI Capability Specification
- **Capability:** Client-side Zero-Shot Text Classification (`@huggingface/transformers`) + Agronomic Benchmark Scoring.
- **Inputs:** Unstructured expense description + farm ledger metrics.
- **Outputs:** Predicted ERP category with confidence badge + structured Margin Health Report.

## 6. Success Metrics
- Zero external API keys required; 100% functional in incognito mode.
- All unit tests pass in GitHub Actions CI.