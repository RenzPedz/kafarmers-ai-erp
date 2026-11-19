import { describe, it, expect } from "vitest";
import { calculateFarmKpis, validateExpense } from "../src/utils/farmCalculations";

describe("KaFarmers AI ERP Calculations & Validation", () => {
  it("calculates cost per hectare, break-even PHP/kg, and projected profit", () => {
    const expenses = [
      { id: "1", description: "Hybrid Palay Seeds", category: "Seeds", amount: 10000 },
      { id: "2", description: "Urea 46-0-0", category: "Fertilizer", amount: 26000 }
    ];
    const result = calculateFarmKpis(expenses, 2, 12000, 20);
    expect(result.totalCost).toBe(36000);
    expect(result.costPerHectare).toBe(18000);
    expect(result.breakEvenPricePerKg).toBe(3);
    expect(result.projectedNetProfit).toBe(204000);
  });

  it("throws an error when hectares or expected yield is zero or negative", () => {
    expect(() => calculateFarmKpis([], 0, 10000, 20)).toThrow();
    expect(() => calculateFarmKpis([], 3, -500, 20)).toThrow();
  });

  it("rejects empty descriptions and negative or zero amounts", () => {
    expect(validateExpense("", 1500)).not.toBeNull();
    expect(validateExpense("Complete Fertilizer", -500)).not.toBeNull();
    expect(validateExpense("Complete Fertilizer", 4500)).toBeNull();
  });
});