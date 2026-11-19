import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Sprout, Wallet, Gauge, Scale, PiggyBank, Sparkles, Loader2, Trash2, Plus,
  Wand2, AlertTriangle, ShieldCheck, Save, CheckCircle2, X, WifiOff, Leaf, Activity, ChevronDown,
} from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import {
  CATEGORIES, CROP_TYPES, computeKpis, formatPeso, runMarginAudit, todayISO,
  validateExpense, validateFarmSetup, type Category, type CropType, type Expense,
  type FarmSetup, type MarginAudit,
} from './lib/erpMath';
import {
  classifyExpense, getModelStatus, onModelStatus, preloadModel, type ModelStatus,
} from './lib/aiCategorize';
import { subscribeTelemetry, trackEvent, type TelemetryEvent } from './utils/monitoring';

interface FarmSettingsRow {
  farm_name: string;
  total_hectares: number;
  crop_type: string;
  expected_yield_kg: number;
  farmgate_price_per_kg: number;
}

const DEFAULT_SETUP: FarmSetup = {
  farmName: 'Isabela Valley Estate',
  totalHectares: 3.5,
  cropType: 'Irrigated Rice',
  expectedYieldKg: 18000,
  farmgatePricePerKg: 21,
};

const categoryStyles: Record<Category, string> = {
  Seeds: 'bg-lime-100 text-lime-800 border-lime-200',
  Fertilizer: 'bg-amber-100 text-amber-800 border-amber-200',
  Pesticide: 'bg-rose-100 text-rose-800 border-rose-200',
  Labor: 'bg-sky-100 text-sky-800 border-sky-200',
  'Fuel & Irrigation': 'bg-teal-100 text-teal-800 border-teal-200',
};

const peso0 = (n: number) =>
  `₱${Math.round(n).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;

export default function App() {
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [setup, setSetup] = useState<FarmSetup>(DEFAULT_SETUP);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Farm setup editing
  const [setupDraft, setSetupDraft] = useState<FarmSetup>(DEFAULT_SETUP);
  const [setupIssues, setSetupIssues] = useState<ReturnType<typeof validateFarmSetup>>([]);

  // Expense form
  const [form, setForm] = useState({
    description: '',
    amount: '',
    plot_name: '',
    expense_date: todayISO(),
    category: '' as '' | Category,
  });
  const [formIssues, setFormIssues] = useState<ReturnType<typeof validateExpense>>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus>(getModelStatus());

  // Audit
  const [audit, setAudit] = useState<MarginAudit | null>(null);
  const [auditRunning, setAuditRunning] = useState(false);
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const [telemetryLog, setTelemetryLog] = useState<TelemetryEvent[]>([]);

  useEffect(() => onModelStatus(setModelStatus), []);
  useEffect(
    () => subscribeTelemetry(setTelemetryLog),
    [],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setDbError(null);
    const [settingsRes, expensesRes] = await Promise.all([
      supabase.from('farm_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
    ]);
    if (settingsRes.error || expensesRes.error) {
      setDbError(settingsRes.error?.message ?? expensesRes.error?.message ?? 'Could not load farm data.');
    }
    if (settingsRes.data) {
      const row = settingsRes.data as FarmSettingsRow;
      const loaded: FarmSetup = {
        farmName: row.farm_name,
        totalHectares: Number(row.total_hectares),
        cropType: (CROP_TYPES as string[]).includes(row.crop_type) ? (row.crop_type as CropType) : 'Irrigated Rice',
        expectedYieldKg: Number(row.expected_yield_kg),
        farmgatePricePerKg: Number(row.farmgate_price_per_kg),
      };
      setSetup(loaded);
      setSetupDraft(loaded);
    }
    if (expensesRes.data) setExpenses(expensesRes.data as Expense[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const dirtySetup =
    setupDraft.farmName !== setup.farmName ||
    setupDraft.totalHectares !== setup.totalHectares ||
    setupDraft.cropType !== setup.cropType ||
    setupDraft.expectedYieldKg !== setup.expectedYieldKg ||
    setupDraft.farmgatePricePerKg !== setup.farmgatePricePerKg;

  const saveSetup = async () => {
    const issues = validateFarmSetup(setupDraft);
    setSetupIssues(issues);
    if (issues.length > 0) return;
    setSaveState('saving');
    const { error } = await supabase
      .from('farm_settings')
      .update({
        farm_name: setupDraft.farmName.trim(),
        total_hectares: Number(setupDraft.totalHectares),
        crop_type: setupDraft.cropType,
        expected_yield_kg: Number(setupDraft.expectedYieldKg),
        farmgate_price_per_kg: Number(setupDraft.farmgatePricePerKg),
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);
    if (!error) {
      setSetup({ ...setupDraft });
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } else {
      setSaveState('idle');
      setDbError('Could not save farm settings. ' + error.message);
    }
  };

  const kpis = useMemo(
    () => computeKpis(expenses, setup),
    [expenses, setup],
  );

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const issues = validateExpense({ ...form, category: form.category === '' ? '' : form.category });
    setFormIssues(issues);
    if (issues.length > 0 || form.category === '') return;
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        description: form.description.trim(),
        amount: Number(form.amount),
        plot_name: form.plot_name.trim(),
        expense_date: form.expense_date,
        category: form.category,
        source: 'manual',
      })
      .select()
      .single();
    if (!error && data) {
      setExpenses((prev) => [data as Expense, ...prev]);
      trackEvent('expense_added', 'ledger_crud', { category: form.category, amount: Number(form.amount) });
      setForm({ description: '', amount: '', plot_name: form.plot_name, expense_date: todayISO(), category: '' });
      setFormIssues([]);
      setAiNote(null);
    } else {
      if (error) trackEvent('supabase_write_error', 'runtime_error', { message: error.message });
      setDbError('Could not add expense. ' + (error?.message ?? ''));
    }
  };

  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) setExpenses((prev) => prev.filter((x) => x.id !== id));
  };

  const autoCategorize = async () => {
    if (form.description.trim().length === 0) {
      setAiNote('Type an expense description first, then tap AI Auto-Categorize.');
      return;
    }
    setAiBusy(true);
    setAiNote(null);
    const startedAt = performance.now();
    try {
      const result = await classifyExpense(form.description.trim());
      setForm((f) => ({ ...f, category: result.category }));
      trackEvent(
        'ai_expense_classified',
        'ai_inference',
        { category: result.category },
        Math.round(performance.now() - startedAt),
      );
      setAiNote(
        result.method === 'model'
          ? `AI matched this to ${result.category} (${Math.round(result.confidence * 100)}% confidence).`
          : `Classified as ${result.category} using keyword matching while the AI model loads.`,
      );
    } catch (err) {
      trackEvent(
        'ai_classification_failed',
        'runtime_error',
        { error: String(err) },
        Math.round(performance.now() - startedAt),
      );
      setAiNote('AI classification failed. Please pick a category manually.');
    } finally {
      setAiBusy(false);
    }
  };

  const runAudit = async () => {
    setAuditRunning(true);
    preloadModel(); // warm the model in the background for future categorization
    const startedAt = performance.now();
    await new Promise((r) => setTimeout(r, 700)); // let the panel animate in
    const result = runMarginAudit(expenses, setup);
    trackEvent(
      'ai_margin_audit_completed',
      'ai_inference',
      { healthScore: result.score },
      Math.round(performance.now() - startedAt),
    );
    setAudit(result);
    setAuditRunning(false);
  };

  const modelBadge = () => {
    if (modelStatus.state === 'loading') {
      return { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, text: `AI model loading ${Math.round(modelStatus.progress)}%`, cls: 'bg-sky-50 text-sky-700 border-sky-200' };
    }
    if (modelStatus.state === 'ready') {
      return { icon: <Sparkles className="h-3.5 w-3.5" />, text: 'AI model ready', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    if (modelStatus.state === 'failed') {
      return { icon: <WifiOff className="h-3.5 w-3.5" />, text: 'Offline — keyword mode', cls: 'bg-stone-100 text-stone-600 border-stone-200' };
    }
    return { icon: <Sparkles className="h-3.5 w-3.5" />, text: 'AI model on standby', cls: 'bg-stone-100 text-stone-600 border-stone-200' };
  };
  const badge = modelBadge();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-stone-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading your farm...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-emerald-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700/60 ring-1 ring-emerald-500/40">
                <Sprout className="h-5 w-5 text-emerald-200" />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight">KaFarmers AI</h1>
                <p className="text-xs text-emerald-200/80">Input Cost &amp; Margin Mini-ERP</p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${badge.cls}`}>
              {badge.icon} {badge.text}
            </span>
            <button
              onClick={() => setTelemetryOpen((o) => !o)}
              aria-expanded={telemetryOpen}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-800/40 px-3 py-1 text-xs font-medium text-emerald-100 transition hover:bg-emerald-700/50"
            >
              <Activity className="h-3.5 w-3.5" /> Telemetry
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${telemetryOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
        {telemetryOpen && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-950/50 p-4">
            {telemetryLog.length === 0 ? (
              <p className="text-xs text-emerald-200/70">No telemetry events recorded yet. Actions you take will appear here.</p>
            ) : (
              <ul className="max-h-64 space-y-1 overflow-y-auto text-xs">
                {telemetryLog.map((ev) => (
                  <li key={ev.id} className="flex flex-wrap items-baseline gap-2 text-emerald-100/90">
                    <span className="text-emerald-300/70 tabular-nums">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="font-semibold">{ev.name}</span>
                    <span className="rounded-full bg-emerald-900/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-300">{ev.category}</span>
                    {ev.props && (
                      <span className="text-emerald-200/70">
                        {Object.entries(ev.props).map(([k, v]) => `${k}: ${String(v)}`).join(' · ')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {dbError && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{dbError}</span>
            <button onClick={() => setDbError(null)} className="ml-auto text-rose-500 hover:text-rose-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <FarmSetupBar
          draft={setupDraft}
          issues={setupIssues}
          dirty={dirtySetup}
          saveState={saveState}
          onChange={setSetupDraft}
          onSave={saveSetup}
        />

        {/* KPI cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            icon={<Wallet className="h-5 w-5" />}
            tint="bg-emerald-100 text-emerald-700"
            label="Total Spend"
            value={peso0(kpis.totalSpend)}
            sub={`${expenses.length} expense${expenses.length === 1 ? '' : 's'} logged`}
          />
          <KpiCard
            icon={<Gauge className="h-5 w-5" />}
            tint="bg-amber-100 text-amber-700"
            label="Cost per Hectare"
            value={peso0(kpis.costPerHectare)}
            sub={`across ${setup.totalHectares} ha`}
          />
          <KpiCard
            icon={<Scale className="h-5 w-5" />}
            tint="bg-sky-100 text-sky-700"
            label="Break-Even Price"
            value={`₱${kpis.breakEvenPrice.toFixed(2)}/kg`}
            sub={`farmgate now ₱${setup.farmgatePricePerKg}/kg`}
            highlight={setup.farmgatePricePerKg < kpis.breakEvenPrice ? 'below' : undefined}
          />
          <KpiCard
            icon={<PiggyBank className="h-5 w-5" />}
            tint={kpis.projectedNetProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}
            label="Projected Net Profit"
            value={peso0(kpis.projectedNetProfit)}
            sub={`${setup.expectedYieldKg.toLocaleString()} kg × ${formatPeso(setup.farmgatePricePerKg)}/kg`}
          />
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
          {/* Ledger */}
          <section className="xl:col-span-3 card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold">Expense Ledger</h2>
                <p className="text-sm text-stone-500">Log farm input costs per plot, with AI sorting.</p>
              </div>
            </div>

            <form onSubmit={addExpense} className="grid grid-cols-1 sm:grid-cols-6 gap-3 mb-6">
              <div className="sm:col-span-4">
                <label className="field-label" htmlFor="desc">Description</label>
                <input
                  id="desc"
                  className="field-input"
                  placeholder="e.g. Urea 46-0-0, 10 bags"
                  value={form.description}
                  maxLength={200}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="amount">Amount (PHP)</label>
                <input
                  id="amount"
                  className="field-input"
                  type="number" min="0" step="0.01" inputMode="decimal"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="plot">Plot Name</label>
                <input
                  id="plot"
                  className="field-input"
                  placeholder="Plot A - North Field"
                  value={form.plot_name}
                  maxLength={80}
                  onChange={(e) => setForm({ ...form, plot_name: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="date">Date</label>
                <input
                  id="date"
                  className="field-input"
                  type="date"
                  value={form.expense_date}
                  onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="cat">Category</label>
                <select
                  id="cat"
                  className="field-input"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                >
                  <option value="">Select category...</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 flex items-end gap-2">
                <button
                  type="button"
                  onClick={autoCategorize}
                  disabled={aiBusy}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                >
                  {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  AI Auto-Categorize
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
              {formIssues.length > 0 && (
                <div className="sm:col-span-6 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  {formIssues.map((i, idx) => <p key={idx}>{i.message}</p>)}
                </div>
              )}
              {aiNote && (
                <div className="sm:col-span-6 text-sm text-sky-800 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0" /> {aiNote}
                </div>
              )}
            </form>

            {expenses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-300 py-10 text-center text-sm text-stone-500">
                No expenses yet. Add your first input cost above.
              </div>
            ) : (
              <ul className="divide-y divide-stone-100">
                {expenses.map((x) => (
                  <li key={x.id} className="flex flex-wrap items-center gap-3 py-3 group">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-800 truncate">{x.description}</p>
                      <p className="text-xs text-stone-500">
                        {x.plot_name} · {x.expense_date}
                        {x.source === 'ai' ? ' · AI sorted' : ''}
                      </p>
                    </div>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${categoryStyles[x.category]}`}>
                      {x.category}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{formatPeso(Number(x.amount))}</span>
                    <button
                      onClick={() => deleteExpense(x.id)}
                      aria-label={`Delete ${x.description}`}
                      className="rounded-md p-1.5 text-stone-400 opacity-0 transition group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 focus:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Optimizer */}
          <section className="xl:col-span-2 space-y-6">
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-2">
                <Leaf className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-bold">AI Margin &amp; Input Optimizer</h2>
              </div>
              <p className="text-sm text-stone-500 mb-4">
                Compares your spend mix against {setup.cropType.toLowerCase()} benchmarks and finds savings.
              </p>
              <button
                onClick={runAudit}
                disabled={auditRunning || expenses.length === 0}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:opacity-50"
              >
                {auditRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Run AI Margin Audit
              </button>

              {audit && !auditRunning && (
                <div className="mt-6 space-y-5">
                  <div className="flex items-center gap-4">
                    <ScoreRing score={audit.score} />
                    <div>
                      <p className="font-bold text-stone-900">{audit.grade}</p>
                      <p className="text-xs text-stone-500">Margin Health Score / 100</p>
                      <p className={`mt-1 text-sm font-semibold ${audit.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        Net {peso0(audit.netProfit)} · margin {audit.marginPct.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="field-label">Spend mix vs benchmark</p>
                    <div className="space-y-2">
                      {audit.categoryShares.map((c) => (
                        <div key={c.category}>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="font-medium text-stone-700">{c.category}</span>
                            <span className="text-stone-500">{c.pctOfSpend.toFixed(0)}% of spend</span>
                          </div>
                          <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${c.pctOfSpend > benchmarkOf(c.category, setup.cropType) ? 'bg-amber-500' : 'bg-emerald-600'}`}
                              style={{ width: `${Math.min(100, c.pctOfSpend)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {audit.alerts.length > 0 && (
                    <div>
                      <p className="field-label flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Overspending alerts
                      </p>
                      <ul className="space-y-2">
                        {audit.alerts.map((a) => (
                          <li key={a.category} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                            {a.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {audit.savings.length > 0 && (
                    <div>
                      <p className="field-label flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Estimated savings
                      </p>
                      <ul className="space-y-2">
                        {audit.savings.map((s) => (
                          <li key={s.label} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-emerald-900">{s.label}</p>
                              <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
                                ≈ {peso0(s.estimatedSavingsPhp)}
                              </span>
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-emerald-800/80">{s.detail}</p>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3 text-sm font-semibold text-stone-700">
                        Total potential savings ≈ {peso0(audit.savings.reduce((t, s) => t + s.estimatedSavingsPhp, 0))}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {!audit && expenses.length === 0 && (
                <p className="mt-4 text-xs text-stone-500">Add at least one expense to run the audit.</p>
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 pb-8 text-xs text-stone-400">
        KaFarmers AI · Benchmarks are planning guides, not guarantees. Built for Philippine smallholder farms.
      </footer>
    </div>
  );
}

function benchmarkOf(category: Category, crop: CropType): number {
  // local helper kept in sync with erpMath benchmarks for bar coloring
  const b: Record<CropType, Record<Category, number>> = {
    'Irrigated Rice': { Seeds: 12, Fertilizer: 30, Pesticide: 10, Labor: 28, 'Fuel & Irrigation': 20 },
    'Yellow Corn': { Seeds: 18, Fertilizer: 32, Pesticide: 8, Labor: 24, 'Fuel & Irrigation': 18 },
    'High-Value Crops': { Seeds: 15, Fertilizer: 25, Pesticide: 12, Labor: 30, 'Fuel & Irrigation': 18 },
  };
  return b[crop][category];
}

function KpiCard({ icon, tint, label, value, sub, highlight }: {
  icon: React.ReactNode;
  tint: string;
  label: string;
  value: string;
  sub: string;
  highlight?: 'below';
}) {
  return (
    <div className="card p-5 transition hover:shadow-md">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tint}`}>{icon}</span>
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
        {highlight === 'below' && (
          <span className="ml-auto rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">Below break-even</span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-stone-900 tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-stone-500">{sub}</p>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const color = score >= 85 ? '#059669' : score >= 70 ? '#16a34a' : score >= 55 ? '#d97706' : '#dc2626';
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0" role="img" aria-label={`Score ${score} of 100`}>
      <circle cx="44" cy="44" r={radius} fill="none" stroke="#f1f0ee" strokeWidth="9" />
      <circle
        cx="44" cy="44" r={radius} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        transform="rotate(-90 44 44)"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x="44" y="50" textAnchor="middle" className="fill-stone-900 font-bold" style={{ fontSize: 20 }}>{score}</text>
    </svg>
  );
}

function FarmSetupBar({ draft, issues, dirty, saveState, onChange, onSave }: {
  draft: FarmSetup;
  issues: ReturnType<typeof validateFarmSetup>;
  dirty: boolean;
  saveState: 'idle' | 'saving' | 'saved';
  onChange: (s: FarmSetup) => void;
  onSave: () => void;
}) {
  const issueFor = (field: string) => issues.find((i) => i.field === field)?.message;
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Farm Setup</h2>
        <button
          onClick={onSave}
          disabled={!dirty || saveState === 'saving'}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
            saveState === 'saved'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-stone-200 disabled:text-stone-500'
          }`}
        >
          {saveState === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" />
            : saveState === 'saved' ? <CheckCircle2 className="h-4 w-4" />
            : <Save className="h-4 w-4" />}
          {saveState === 'saved' ? 'Saved' : 'Save'}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-2">
          <label className="field-label" htmlFor="farmName">Farm Name</label>
          <input
            id="farmName"
            className="field-input"
            value={draft.farmName}
            maxLength={80}
            onChange={(e) => onChange({ ...draft, farmName: e.target.value })}
          />
          {issueFor('farmName') && <p className="mt-1 text-xs text-rose-600">{issueFor('farmName')}</p>}
        </div>
        <div>
          <label className="field-label" htmlFor="ha">Total Hectares</label>
          <input
            id="ha"
            className="field-input"
            type="number" min="0.1" step="0.1"
            value={draft.totalHectares}
            onChange={(e) => onChange({ ...draft, totalHectares: Number(e.target.value) })}
          />
          {issueFor('totalHectares') && <p className="mt-1 text-xs text-rose-600">{issueFor('totalHectares')}</p>}
        </div>
        <div>
          <label className="field-label" htmlFor="crop">Crop Type</label>
          <select
            id="crop"
            className="field-input"
            value={draft.cropType}
            onChange={(e) => onChange({ ...draft, cropType: e.target.value as CropType })}
          >
            {CROP_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="yield">Expected Yield (kg)</label>
          <input
            id="yield"
            className="field-input"
            type="number" min="1" step="1"
            value={draft.expectedYieldKg}
            onChange={(e) => onChange({ ...draft, expectedYieldKg: Number(e.target.value) })}
          />
          {issueFor('expectedYieldKg') && <p className="mt-1 text-xs text-rose-600">{issueFor('expectedYieldKg')}</p>}
        </div>
        <div className="sm:col-span-2 lg:col-span-1">
          <label className="field-label" htmlFor="price">Farmgate Price (₱/kg)</label>
          <input
            id="price"
            className="field-input"
            type="number" min="0.01" step="0.01"
            value={draft.farmgatePricePerKg}
            onChange={(e) => onChange({ ...draft, farmgatePricePerKg: Number(e.target.value) })}
          />
          {issueFor('farmgatePricePerKg') && <p className="mt-1 text-xs text-rose-600">{issueFor('farmgatePricePerKg')}</p>}
        </div>
      </div>
    </section>
  );
}
