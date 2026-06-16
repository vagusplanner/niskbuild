import { BRAND_COLORS } from '@/lib/brand-colors';

export type FigmaNode = {
  id: string;
  name: string;
  type: string;
  absoluteBoundingBox?: { width?: number; height?: number };
  children?: FigmaNode[];
};

export type FigmaFileResponse = {
  document?: FigmaNode;
  name?: string;
};

export type FigmaComponentSummary = {
  id: string;
  name: string;
  type: string;
  properties: {
    width: number;
    height: number;
  };
  componentName: string;
};

export function extractFigmaFileKey(url: string): string | null {
  const trimmed = url.trim();
  const match = trimmed.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

export function extractComponents(fileData: FigmaFileResponse): FigmaComponentSummary[] {
  const components: FigmaComponentSummary[] = [];
  const usedNames = new Set<string>();

  function uniqueName(base: string): string {
    let name = sanitizeComponentName(base);
    let n = 2;
    while (usedNames.has(name)) {
      name = `${sanitizeComponentName(base)}${n}`;
      n++;
    }
    usedNames.add(name);
    return name;
  }

  function traverse(node: FigmaNode) {
    if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      components.push({
        id: node.id,
        name: node.name,
        type: node.type,
        properties: {
          width: node.absoluteBoundingBox?.width ?? 0,
          height: node.absoluteBoundingBox?.height ?? 0,
        },
        componentName: uniqueName(node.name),
      });
    }
    node.children?.forEach(traverse);
  }

  if (fileData.document) {
    traverse(fileData.document);
  }

  return components;
}

export function sanitizeComponentName(name: string): string {
  let safe = name.replace(/[^a-zA-Z0-9]/g, '');
  if (!safe) safe = 'Component';
  if (/^\d/.test(safe)) safe = `C${safe}`;
  return safe.charAt(0).toUpperCase() + safe.slice(1);
}

export function generateReactCode(components: FigmaComponentSummary[]): string {
  if (components.length === 0) {
    return `// No components found in this Figma file.
// Add COMPONENT or INSTANCE nodes in Figma and try again.

export default function App() {
  return (
    <div className="min-h-screen p-8 text-center" style={{ background: '${BRAND_COLORS.bgGradient}', color: '${BRAND_COLORS.carbonObsidian}' }}>
      <h1 className="text-2xl font-bold">No components found</h1>
      <p className="mt-2 opacity-70">Add components to your Figma file and import again.</p>
    </div>
  );
}`;
  }

  const componentBlocks = components
    .map((comp) => {
      const w = comp.properties.width > 0 ? comp.properties.width : 'auto';
      const h = comp.properties.height > 0 ? comp.properties.height : 'auto';
      return `
function ${comp.componentName}() {
  return (
    <div
      style={{
        width: ${typeof w === 'number' ? w : `'${w}'`},
        height: ${typeof h === 'number' ? h : `'${h}'`},
        borderColor: '${BRAND_COLORS.glacialMistEnd}',
        background: '${BRAND_COLORS.white}',
      }}
      className="rounded-xl border p-4"
    >
      <div className="text-sm font-semibold" style={{ color: '${BRAND_COLORS.carbonObsidian}' }}>${comp.name}</div>
      <div className="text-xs mt-1" style={{ color: '${BRAND_COLORS.forestDeep}' }}>${comp.type}</div>
    </div>
  );
}`;
    })
    .join('\n');

  const jsx = components.map((c) => `<${c.componentName} />`).join('\n        ');

  return `import React from 'react';

${componentBlocks}

export default function App() {
  return (
    <div className="min-h-screen p-8" style={{ background: '${BRAND_COLORS.bgGradient}', color: '${BRAND_COLORS.carbonObsidian}' }}>
      <h1 className="text-2xl font-bold mb-2">Figma import</h1>
      <p className="text-sm mb-6" style={{ color: '${BRAND_COLORS.forestDeep}' }}>${components.length} component${components.length === 1 ? '' : 's'} imported from Figma</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${jsx}
      </div>
    </div>
  );
}`;
}

export async function fetchFigmaFile(fileKey: string, token: string): Promise<FigmaFileResponse> {
  const response = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
    headers: { 'X-Figma-Token': token },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    if (response.status === 403) {
      throw new Error('Invalid Figma token or no access to this file');
    }
    if (response.status === 404) {
      throw new Error('Figma file not found — check the URL');
    }
    throw new Error(`Figma API error (${response.status})${text ? `: ${text.slice(0, 120)}` : ''}`);
  }

  return response.json() as Promise<FigmaFileResponse>;
}
