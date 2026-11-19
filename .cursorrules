# Coding Guidelines for KaFarmers AI
- Use TypeScript strict mode.
- Keep all AI inference strictly client-side using `@huggingface/transformers` with a deterministic keyword fallback (no external OpenAI/Anthropic API keys).
- Isolate pure financial math and input validation in `src/lib/erpMath.ts` for Vitest unit testing.
- Validate all user inputs before updating ledger state.