export interface LedgerExpense {
  id: string;
  description: string;
  category: string;
  amount: number;
}

export function calculateFarmKpis(
  expenses: LedgerExpense[],
  hectares: number,
  expectedYieldKg: number,
  expectedPricePerKg: number
) {
  if (hectares <= 0 || expectedYieldKg <= 0) {
    throw new Error("Hectares and expected yield must be greater than zero.");
  }
  const totalCost = expenses.reduce((sum, item) => sum + item.amount, 0);
  const costPerHectare = totalCost / hectares;
  const breakEvenPricePerKg = totalCost / expectedYieldKg;
  const projectedRevenue = expectedYieldKg * expectedPricePerKg;
  const projectedNetProfit = projectedRevenue - totalCost;

  return {
    totalCost,
    costPerHectare,
    breakEvenPricePerKg,
    projectedRevenue,
    projectedNetProfit
  };
}

export function validateExpense(description: string, amount: number): string | null {
  if (!description || description.trim().length < 2) {
    return "Description must be at least 2 characters.";
  }
  if (Number.isNaN(amount) || amount <= 0) {
    return "Amount must be greater than zero.";
  }
  return null;
}