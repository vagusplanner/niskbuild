import type { StyleChanges } from '@/lib/visual-editor-types';

const STYLE_LABELS: Record<keyof StyleChanges, string> = {
  backgroundColor: 'background-color',
  color: 'text color',
  fontSize: 'font-size',
  fontWeight: 'font-weight',
  paddingTop: 'padding-top',
  paddingRight: 'padding-right',
  paddingBottom: 'padding-bottom',
  paddingLeft: 'padding-left',
  borderRadius: 'border-radius',
  borderWidth: 'border-width',
  borderColor: 'border-color',
  opacity: 'opacity',
  display: 'display',
  mobileFontSize: 'mobile font-size',
  mobilePaddingTop: 'mobile padding-top',
  mobilePaddingRight: 'mobile padding-right',
  mobilePaddingBottom: 'mobile padding-bottom',
  mobilePaddingLeft: 'mobile padding-left',
  mobileDisplay: 'mobile display',
};

function formatStyleValue(key: keyof StyleChanges, value: string | number): string {
  if (key === 'fontSize' || key === 'mobileFontSize') return `${value}px`;
  if (key.startsWith('padding') || key.startsWith('mobilePadding')) return `${value}px`;
  if (key === 'borderRadius') return `${value}px`;
  if (key === 'borderWidth') return `${value}px`;
  if (key === 'opacity') return String(value);
  if (key === 'fontWeight') return String(value);
  return String(value);
}

export function buildVisualEditPrompt(params: {
  componentName: string;
  breadcrumb: string[];
  selector: string;
  styles: StyleChanges;
  currentCode: string;
  isMobile?: boolean;
}): string {
  const changes = Object.entries(params.styles)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      const label = STYLE_LABELS[key as keyof StyleChanges] || key;
      return `${label} to ${formatStyleValue(key as keyof StyleChanges, value as string | number)}`;
    });

  const componentName = params.componentName || params.breadcrumb[params.breadcrumb.length - 1] || 'element';
  const changeText = changes.length ? changes.join(', ') : 'no changes';
  const mobileNote = params.isMobile
    ? ' Apply changes inside a @media (max-width: 768px) block for mobile viewport.'
    : '';

  return [
    `Update the ${componentName} element (${params.breadcrumb.join(' > ')}), selector "${params.selector}": set ${changeText}.`,
    'Keep all other styles and layout exactly the same.',
    mobileNote,
    'Return the complete updated HTML document starting with <!DOCTYPE html>.',
    '',
    '--- CURRENT CODE ---',
    params.currentCode.slice(0, 12000),
  ]
    .filter(Boolean)
    .join('\n');
}
