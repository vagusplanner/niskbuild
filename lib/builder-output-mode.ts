/** Builder output mode: Simple (single/multi HTML) vs Full App (React+Vite). */

export const BUILDER_OUTPUT_MODES = ['simple', 'full-app'] as const;
export type BuilderOutputMode = (typeof BUILDER_OUTPUT_MODES)[number];

export const DEFAULT_BUILDER_OUTPUT_MODE: BuilderOutputMode = 'simple';

export function isBuilderOutputMode(value: unknown): value is BuilderOutputMode {
  return value === 'simple' || value === 'full-app';
}

export function parseBuilderOutputMode(value: unknown): BuilderOutputMode {
  return isBuilderOutputMode(value) ? value : DEFAULT_BUILDER_OUTPUT_MODE;
}

export const BUILDER_OUTPUT_MODE_LABELS: Record<
  BuilderOutputMode,
  { short: string; title: string; hint: string }
> = {
  simple: {
    short: 'Simple',
    title: 'Simple (HTML)',
    hint: 'Single-file or multi-page HTML — fast prototypes, landings, and tools.',
  },
  'full-app': {
    short: 'Full App',
    title: 'Full App (React)',
    hint: 'Multi-file React + Vite with real routing and shared state. Own the code.',
  },
};
