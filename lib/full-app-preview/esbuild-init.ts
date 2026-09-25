/**
 * Lazy, idempotent esbuild-wasm initialize for browser (and Node spike).
 */

import type { initialize as EsbuildInitialize } from 'esbuild-wasm';

export type EnsureEsbuildOptions = {
  /** Absolute or relative URL to esbuild.wasm (browser). */
  wasmURL?: string;
  /** Prefer worker (browser default true). */
  worker?: boolean;
};

type EsbuildModule = typeof import('esbuild-wasm');

let initPromise: Promise<EsbuildModule> | null = null;
let esbuildMod: EsbuildModule | null = null;

const DEFAULT_WASM_URL = '/preview-runtime/esbuild.wasm';

/**
 * Initialize once. Safe to call from React effects / concurrent callers.
 */
export async function ensureEsbuildInitialized(
  opts: EnsureEsbuildOptions = {}
): Promise<EsbuildModule> {
  if (esbuildMod) return esbuildMod;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Force browser build — package "main" is the Node service wrapper.
    const esbuild = await import('esbuild-wasm/lib/browser.js');
    const wasmURL = opts.wasmURL ?? DEFAULT_WASM_URL;
    const worker = opts.worker ?? typeof window !== 'undefined';

    // initialize throws if called twice — guard via module-level promise.
    await (esbuild.initialize as typeof EsbuildInitialize)({
      wasmURL,
      worker,
    });

    esbuildMod = esbuild as EsbuildModule;
    return esbuildMod;
  })().catch((err) => {
    initPromise = null;
    throw err;
  });

  return initPromise;
}

export function getEsbuild(): EsbuildModule | null {
  return esbuildMod;
}
