import 'server-only';

import fs from 'fs/promises';
import path from 'path';

export const VP_SRC_ROOT = path.join(process.cwd(), 'apps/vagus-planner/src');

export const VAGUS_PLANNER_PREVIEW_URL =
  process.env.NEXT_PUBLIC_VAGUS_PLANNER_URL?.trim() || 'http://localhost:5175';

export type VpBuilderTarget = {
  id: string;
  label: string;
  file: string;
  route: string;
};

/** Primary pages users edit in the VP builder. */
export const VP_BUILDER_TARGETS: VpBuilderTarget[] = [
  { id: 'Dashboard', label: 'Dashboard', file: 'pages/Dashboard.jsx', route: '/Dashboard' },
  { id: 'Calendar', label: 'Calendar', file: 'pages/Calendar.jsx', route: '/Calendar' },
  { id: 'Account', label: 'Account', file: 'pages/Account.jsx', route: '/Account' },
  { id: 'Settings', label: 'Settings', file: 'pages/Settings.jsx', route: '/Settings' },
  { id: 'Finance', label: 'Finance', file: 'pages/Finance.jsx', route: '/Finance' },
  { id: 'Goals', label: 'Goals', file: 'pages/Goals.jsx', route: '/Goals' },
  { id: 'Travel', label: 'Travel', file: 'pages/Travel.jsx', route: '/Travel' },
  { id: 'Islam', label: 'Islam', file: 'pages/Islam.jsx', route: '/Islam' },
  { id: 'Profile', label: 'Profile', file: 'pages/Profile.jsx', route: '/Profile' },
  { id: 'Notifications', label: 'Notifications', file: 'pages/Notifications.jsx', route: '/Notifications' },
  { id: 'Layout', label: 'Layout shell', file: 'Layout.jsx', route: '/Dashboard' },
];

export function getVpTargetById(id: string): VpBuilderTarget | undefined {
  return VP_BUILDER_TARGETS.find((t) => t.id === id);
}

export function resolveVpRelativePath(relativePath: string): string {
  const normalized = relativePath.replace(/^\/+/, '').replace(/\\/g, '/');
  if (normalized.includes('..')) {
    throw new Error('Invalid file path');
  }

  const absolute = path.resolve(VP_SRC_ROOT, normalized);
  if (!absolute.startsWith(VP_SRC_ROOT)) {
    throw new Error('Path escapes Vagus Planner source root');
  }

  return absolute;
}

export async function readVpSource(relativePath: string): Promise<string> {
  const absolute = resolveVpRelativePath(relativePath);
  return fs.readFile(absolute, 'utf8');
}

export async function writeVpSource(relativePath: string, content: string): Promise<void> {
  const absolute = resolveVpRelativePath(relativePath);
  await fs.writeFile(absolute, content, 'utf8');
}

/** Strip markdown fences and preamble from model output. */
export function cleanReactSource(raw: string): string {
  let cleaned = raw.trim();

  const fenced = cleaned.match(/```(?:jsx|tsx|javascript|js|react)?\n?([\s\S]*?)\n?```/i);
  if (fenced) {
    cleaned = fenced[1].trim();
  }

  const importIdx = cleaned.search(/^(import\s|export\s|\/\*|\/\/|'use client'|"use client")/m);
  if (importIdx > 0) {
    cleaned = cleaned.slice(importIdx).trim();
  }

  return cleaned;
}

export function buildVpEditPrompt(params: {
  userPrompt: string;
  relativePath: string;
  currentSource: string;
}): string {
  const truncated =
    params.currentSource.length > 28000
      ? `${params.currentSource.slice(0, 28000)}\n/* …truncated for context… */`
      : params.currentSource;

  return [
    `Edit the Vagus Planner React source file: apps/vagus-planner/src/${params.relativePath}`,
    '',
    'User request:',
    params.userPrompt.trim(),
    '',
    '--- CURRENT SOURCE ---',
    truncated,
    '',
    'Return the complete updated file only.',
  ].join('\n');
}

export const VP_REACT_SYSTEM_PROMPT = `You are an expert React developer editing Vagus Planner — a React 18 app using Tailwind CSS, framer-motion, lucide-react, and @/ path aliases.

Rules:
1. Return ONLY the complete updated source file. No markdown fences. No explanations.
2. Preserve imports, exports, hooks, and data fetching unless the user asks to change them.
3. Use the same coding style, naming, and Tailwind patterns as the input.
4. Keep @/ imports for shared modules under apps/vagus-planner/src/.
5. Do not invent new npm packages unless explicitly requested.
6. Ensure the file remains valid JSX that can run in Vite.`;
