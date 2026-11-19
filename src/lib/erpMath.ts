export type Category =
  | 'Seeds'
  | 'Fertilizer'
  | 'Pesticide'
  | 'Labor'
  | 'Fuel & Irrigation';

export type CropType = 'Irrigated Rice' | 'Yellow Corn' | 'High-Value Crops';

export const CATEGORIES: Category[] = [
  'Seeds',
  'Fertilizer',
  'Pesticide',
  'Labor',
  'Fuel & Irrigation',
];

export const CROP_TYPES: CropType[] = [
  'Irrigated Rice',
  'Yellow Corn',
  'High-Value Crops',
];

export interface Expense {
  id: string;
  description: string;
  amount: number;
  plot_name: string;
  expense_date: string;
  category: Category;
  source: string;
}

export interface FarmSetup {
  farmName: string;
  totalHectares: number;
  cropType: CropType;
  expectedYieldKg: number;
  farmgatePricePerKg: number;
}

export interface Kpis {
  totalSpend: number;
  costPerHectare: number;
  breakEvenPrice: number;
  projectedNetProfit: number;
}

export interface CategoryShare {
  category: Category;
  amount: number;
  pctOfSpend: number;
  pctPerHaOfBenchmark: number;
}

export interface OverspendAlert {
  category: Category;
  amount: number;
  pctOfSpend: number;
  benchmarkPct: number;
  excessAmount: number;
  message: string;
}

export interface SavingOpportunity {
  category: Category;
  label: string;
  estimatedSavingsPhp: number;
  detail: string;
}

export interface MarginAudit {
  score: number;
  grade: 'Excellent' | 'Good' | 'Fair' | 'At Risk' | 'Critical';
  totalSpend: number;
  revenue: number;
  netProfit: number;
  marginPct: number;
  categoryShares: CategoryShare[];
  alerts: OverspendAlert[];
  savings: SavingOpportunity[];
}

/** Per-hectare spend share benchmarks (% of total input spend) per crop. */
export const CATEGORY_BENCHMARKS: Record<CropType, Record<Category, number>> = {
  'Irrigated Rice': {
    Seeds: 12,
    Fertilizer: 30,
    Pesticide: 10,
    Labor: 28,
    'Fuel & Irrigation': 20,
  },
  'Yellow Corn': {
    Seeds: 18,
    Fertilizer: 32,
    Pesticide: 8,
    Labor: 24,
    'Fuel & Irrigation': 18,
  },
  'High-Value Crops': {
    Seeds: 15,
    Fertilizer: 25,
    Pesticide: 12,
    Labor: 30,
    'Fuel & Irrigation': 18,
  },
};

/** Maximum healthy share (% of total spend) before an overspend alert fires. */
const ALERT_THRESHOLDS: Record<Category, number> = {
  Seeds: 25,
  Fertilizer: 35,
  Pesticide: 15,
  Labor: 40,
  'Fuel & Irrigation': 30,
};

const peso = (n: number) => Math.round(n * 100) / 100;

export function round2(n: number): number {
  return peso(n);
}

export interface FieldIssue {
  field: string;
  message: string;
}

export function validateExpense(input: {
  description: string;
  amount: number | string;
  plot_name: string;
  expense_date: string;
  category: string;
}): FieldIssue[] {
  const issues: FieldIssue[] = [];
  if (!input.description || input.description.trim().length === 0) {
    issues.push({ field: 'description', message: 'Description is required.' });
  } else if (input.description.trim().length > 200) {
    issues.push({ field: 'description', message: 'Description must be 200 characters or fewer.' });
  }
  const amount = typeof input.amount === 'string' ? Number(input.amount) : input.amount;
  if (!Number.isFinite(amount) || amount <= 0) {
    issues.push({ field: 'amount', message: 'Amount must be a positive number in PHP.' });
  } else if (amount > 100_000_000) {
    issues.push({ field: 'amount', message: 'Amount is unrealistically large.' });
  }
  if (!input.plot_name || input.plot_name.trim().length === 0) {
    issues.push({ field: 'plot_name', message: 'Plot name is required.' });
  }
  if (!input.expense_date || !/^\d{4}-\d{2}-\d{2}$/.test(input.expense_date)) {
    issues.push({ field: 'expense_date', message: 'A valid date is required.' });
  }
  if (!CATEGORIES.includes(input.category as Category)) {
    issues.push({ field: 'category', message: 'Pick one of the listed categories.' });
  }
  return issues;
}

export function validateFarmSetup(input: {
  farmName: string;
  totalHectares: number | string;
  expectedYieldKg: number | string;
  farmgatePricePerKg: number | string;
}): FieldIssue[] {
  const issues: FieldIssue[] = [];
  if (!input.farmName || input.farmName.trim().length === 0) {
    issues.push({ field: 'farmName', message: 'Farm name is required.' });
  }
  const ha = Number(input.totalHectares);
  if (!Number.isFinite(ha) || ha <= 0 || ha > 100_000) {
    issues.push({ field: 'totalHectares', message: 'Total hectares must be a positive number.' });
  }
  const y = Number(input.expectedYieldKg);
  if (!Number.isFinite(y) || y <= 0 || y > 100_000_000) {
    issues.push({ field: 'expectedYieldKg', message: 'Expected yield (kg) must be a positive number.' });
  }
  const p = Number(input.farmgatePricePerKg);
  if (!Number.isFinite(p) || p <= 0 || p > 10_000) {
    issues.push({ field: 'farmgatePricePerKg', message: 'Farmgate price must be a positive PHP amount per kg.' });
  }
  return issues;
}

export function computeKpis(
  expenses: Pick<Expense, 'amount'>[],
  setup: Pick<FarmSetup, 'totalHectares' | 'expectedYieldKg' | 'farmgatePricePerKg'>,
): Kpis {
  const totalSpend = peso(expenses.reduce((s, e) => s + Number(e.amount || 0), 0));
  const ha = Number(setup.totalHectares) || 0;
  const yieldKg = Number(setup.expectedYieldKg) || 0;
  const price = Number(setup.farmgatePricePerKg) || 0;
  const costPerHectare = ha > 0 ? peso(totalSpend / ha) : 0;
  const breakEvenPrice = yieldKg > 0 ? peso(totalSpend / yieldKg) : 0;
  const revenue = yieldKg * price;
  const projectedNetProfit = peso(revenue - totalSpend);
  return { totalSpend, costPerHectare, breakEvenPrice, projectedNetProfit };
}

/**
 * Runs the margin audit: category shares per hectare vs crop benchmarks,
 * overspend alerts, and estimated PHP savings.
 */
export function runMarginAudit(
  expenses: Pick<Expense, 'amount' | 'category'>[],
  setup: Pick<FarmSetup, 'totalHectares' | 'expectedYieldKg' | 'farmgatePricePerKg' | 'cropType'>,
): MarginAudit {
  const benchmarks = CATEGORY_BENCHMARKS[setup.cropType] ?? CATEGORY_BENCHMARKS['Irrigated Rice'];
  const totalSpend = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const yieldKg = Number(setup.expectedYieldKg) || 0;
  const price = Number(setup.farmgatePricePerKg) || 0;
  const revenue = yieldKg * price;
  const netProfit = revenue - totalSpend;
  const marginPct = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  const byCategory = new Map<Category, number>();
  for (const c of CATEGORIES) byCategory.set(c, 0);
  for (const e of expenses) {
    const cat = (CATEGORIES as string[]).includes(e.category) ? (e.category as Category) : null;
    if (cat) byCategory.set(cat, (byCategory.get(cat) ?? 0) + Number(e.amount || 0));
  }

  const categoryShares: CategoryShare[] = CATEGORIES.map((cat) => {
    const amount = peso(byCategory.get(cat) ?? 0);
    const pctOfSpend = totalSpend > 0 ? (amount / totalSpend) * 100 : 0;
    const benchmarkPct = benchmarks[cat];
    // Scale to per-hectare terms: share of spend is hectare-invariant, so we
    // compare actual share vs benchmark share of the same per-ha pot.
    const pctPerHaOfBenchmark = benchmarkPct > 0 ? (pctOfSpend / benchmarkPct) * 100 : 0;
    return { category: cat, amount, pctOfSpend, pctPerHaOfBenchmark };
  });

  const alerts: OverspendAlert[] = [];
  for (const share of categoryShares) {
    const threshold = ALERT_THRESHOLDS[share.category];
    if (totalSpend > 0 && share.pctOfSpend > threshold) {
      const excessPct = share.pctOfSpend - threshold;
      const excessAmount = peso(totalSpend * (excessPct / 100));
      alerts.push({
        category: share.category,
        amount: share.amount,
        pctOfSpend: share.pctOfSpend,
        benchmarkPct: threshold,
        excessAmount,
        message: `${share.category} is ${share.pctOfSpend.toFixed(1)}% of total spend (healthy limit ${threshold}%), about ${excessAmount.toLocaleString('en-PH', { maximumFractionDigits: 0 })} PHP above the line.`,
      });
    }
  }

  const savings: SavingOpportunity[] = [];
  for (const alert of alerts) {
    savings.push({
      category: alert.category,
      label: `Trim ${alert.category} toward benchmark`,
      estimatedSavingsPhp: alert.excessAmount,
      detail: `Bringing ${alert.category} back to ${alert.benchmarkPct}% of spend frees roughly ${alert.excessAmount.toLocaleString('en-PH', { maximumFractionDigits: 0 })} PHP this season.`,
    });
  }
  if (alerts.length === 0 && totalSpend > 0) {
    savings.push({
      category: 'Fertilizer',
      label: 'Split-apply fertilizer (URC / 50-50 split)',
      estimatedSavingsPhp: peso(totalSpend * 0.05),
      detail: 'Splitting nitrogen application and leaf-color-chart guided topdressing typically saves about 5% of fertilizer spend even on a balanced budget.',
    });
  }
  const fuel = categoryShares.find((c) => c.category === 'Fuel & Irrigation');
  if (fuel && fuel.amount > 0) {
    savings.push({
      category: 'Fuel & Irrigation',
      label: 'AWD irrigation scheduling',
      estimatedSavingsPhp: peso(fuel.amount * 0.2),
      detail: 'Alternate Wetting & Drying cuts water pumping and fuel use by around 20% without hurting yield in most irrigated setups.',
    });
  }

  // Margin Health Score: margin performance + budget balance vs benchmarks.
  const marginScore = clamp(marginPct * 2, 0, 60);
  const balancePenalty = alerts.reduce((s, a) => s + Math.min(a.pctOfSpend - a.benchmarkPct, 25), 0);
  const categorySpread = stdDev(categoryShares.map((c) => c.pctPerHaOfBenchmark));
  const balanceScore = clamp(40 - balancePenalty - clamp(categorySpread / 2, 0, 10), 0, 40);
  const score = totalSpend <= 0 ? 0 : Math.round(clamp(marginScore + balanceScore, 0, 100));

  const grade: MarginAudit['grade'] =
    score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 55 ? 'Fair' : score >= 40 ? 'At Risk' : 'Critical';

  return {
    score,
    grade,
    totalSpend: peso(totalSpend),
    revenue: peso(revenue),
    netProfit: peso(netProfit),
    marginPct: peso(marginPct),
    categoryShares,
    alerts,
    savings,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

const KEYWORD_RULES: Array<{ category: Category; terms: string[] }> = [
  {
    category: 'Seeds',
    terms: ['seed', 'seeds', 'palay', 'binhi', 'hybrid', 'certified', 'sl-8h', 'rcb', 'variety', 'nursery', 'seedling', 'dormant', 'germinat'],
  },
  {
    category: 'Fertilizer',
    terms: ['fertilizer', 'urea', 'npk', '14-14-14', '46-0-0', 'complete', 'ammonium', 'sulfate', 'muriate', 'potash', 'foliar', 'topdress', 'basal', 'humus', 'organic matter'],
  },
  {
    category: 'Pesticide',
    terms: ['pesticide', 'insecticide', 'herbicide', 'fungicide', 'spray', 'spraying', 'rodenticide', 'molluscicide', 'golden kuhol', 'tungro', 'weeds', 'weed', '-roundup', 'confidor', 'license to spray'],
  },
  {
    category: 'Labor',
    terms: ['labor', 'labour', 'worker', 'workers', 'crew', 'wage', 'wages', 'salary', 'planting', 'transplant', 'harvest', 'harvesting', 'thresher', 'operator', 'hakot', 'weeding'],
  },
  {
    category: 'Fuel & Irrigation',
    terms: ['fuel', 'diesel', 'gasoline', 'gas', 'pump', 'irrigation', 'water', 'tractor', 'rental', 'machine', 'machinery', 'engine', 'oil', 'lubricant', 'electric', 'electricity', 'tubig', 'p western', 'hand tractor'],
  },
];

/** Fast keyword-based fallback categorizer (used while the model loads or offline). */
export function keywordCategorize(description: string): { category: Category; confidence: number } {
  const text = description.toLowerCase();
  let best: { category: Category; hits: number } | null = null;
  for (const rule of KEYWORD_RULES) {
    let hits = 0;
    for (const term of rule.terms) {
      if (text.includes(term)) hits += term.includes(' ') ? 2 : 1;
    }
    if (hits > 0 && (!best || hits > best.hits)) {
      best = { category: rule.category, hits };
    }
  }
  if (!best) return { category: 'Labor', confidence: 0.2 };
  return { category: best.category, confidence: Math.min(0.9, 0.5 + best.hits * 0.1) };
}

const CATEGORY_LABELS: Record<Category, string> = {
  Seeds: 'seeds or planting material',
  Fertilizer: 'fertilizer or soil amendment',
  Pesticide: 'pesticide, herbicide, or crop protection',
  Labor: 'labor, wages, or contracting',
  'Fuel & Irrigation': 'fuel, machinery, or irrigation',
};

export function classifierLabels(): string[] {
  return CATEGORIES.map((c) => CATEGORY_LABELS[c]);
}

export function labelToCategory(label: string): Category | null {
  const entry = (Object.entries(CATEGORY_LABELS) as Array<[Category, string]>).find(
    ([, l]) => l === label,
  );
  return entry ? entry[0] : null;
}

export function formatPeso(n: number): string {
  return `₱${n.toLocaleString('en-PH', { maximumFractionDigits: 2, minimumFractionDigits: n % 1 !== 0 ? 2 : 0 })}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
