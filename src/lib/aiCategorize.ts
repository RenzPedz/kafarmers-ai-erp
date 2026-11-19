import { pipeline, env, type ZeroShotClassificationPipeline } from '@huggingface/transformers';
import {
  CATEGORIES,
  classifierLabels,
  keywordCategorize,
  labelToCategory,
  type Category,
} from './erpMath';

env.backends.onnx.wasm!.numThreads = 1;

const MODEL_ID = 'Xenova/mobilebert-uncased-mnli';

let pipelinePromise: Promise<ZeroShotClassificationPipeline> | null = null;

export type ModelStatus =
  | { state: 'idle' }
  | { state: 'loading'; progress: number }
  | { state: 'ready' }
  | { state: 'failed'; reason: string };

let status: ModelStatus = { state: 'idle' };
const statusListeners = new Set<(s: ModelStatus) => void>();

export function getModelStatus(): ModelStatus {
  return status;
}

export function onModelStatus(listener: (s: ModelStatus) => void): () => void {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

function setStatus(next: ModelStatus) {
  status = next;
  statusListeners.forEach((l) => l(next));
}

/** Starts loading the zero-shot pipeline in the background. */
export function preloadModel(): void {
  if (pipelinePromise) return;
  setStatus({ state: 'loading', progress: 0 });
  pipelinePromise = pipeline('zero-shot-classification', MODEL_ID, {
    progress_callback: (p: { status?: string; progress?: number }) => {
      if (p?.status === 'progress' && typeof p.progress === 'number') {
        setStatus({ state: 'loading', progress: p.progress });
      }
    },
  }).catch((err: unknown) => {
    pipelinePromise = null;
    setStatus({
      state: 'failed',
      reason: err instanceof Error ? err.message : 'Model failed to load',
    });
    throw err;
  }) as Promise<ZeroShotClassificationPipeline>;
}

export interface ClassifyResult {
  category: Category;
  confidence: number;
  method: 'model' | 'keyword';
}

/** Classify an expense description. Falls back to keywords while loading/offline. */
export async function classifyExpense(description: string): Promise<ClassifyResult> {
  const fallback = () => {
    const kw = keywordCategorize(description);
    return { ...kw, method: 'keyword' as const };
  };

  try {
    if (!pipelinePromise) preloadModel();
    const extractor = await pipelinePromise!;
    const labels = classifierLabels();
    const output = await extractor(description, labels);
    const result = Array.isArray(output) ? output[0] : output;
    const top = result?.scores?.[0];
    const label = result?.labels?.[0];
    const category = label != null ? labelToCategory(label) : null;
    if (!category || typeof top !== 'number') return fallback();
    // Keep the result within the fixed category list.
    if (!CATEGORIES.includes(category)) return fallback();
    return { category, confidence: top, method: 'model' };
  } catch {
    return fallback();
  }
}
