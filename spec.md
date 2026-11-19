# Technical Specification: KaFarmers AI

## 1. Data Models
- **PlotConfig:** `{ farmName: string, hectares: number, cropType: string, expectedYieldKg: number, expectedPricePerKg: number }`
- **ExpenseItem:** `{ id: string, date: string, plotName: string, category: Category, description: string, amount: number, aiConfidence?: number }`

## 2. Deterministic Math (`src/lib/erpMath.ts`)
- `costPerHectare = totalCost / hectares`
- `breakEvenPricePerKg = totalCost / expectedYieldKg`
- `projectedNetProfit = (expectedYieldKg * expectedPricePerKg) - totalCost`

## 3. In-Browser AI Module
- **Model:** `Xenova/mobilebert-uncased-mnli` loaded via `@huggingface/transformers` (`zero-shot-classification` pipeline) directly in the browser.
- **Candidate Labels:** `["Seeds and Planting", "Fertilizer and Soil Nutrition", "Pesticide and Herbicide", "Farm Labor and Harvesting", "Fuel and Irrigation"]`.
- **Fallback:** Deterministic keyword matcher if WebAssembly/model download is slow or offline so the UI never blocks.

## 4. Acceptance Criteria
1. Typing an expense note and clicking "AI Auto-Categorize" predicts the category and displays a confidence score.
2. Adding/deleting expenses recalculates Break-Even PHP/kg immediately.
3. Negative numbers or zero hectares are rejected with clear validation messages.