import { cleanGeneratedCode } from '@/lib/cleanGeneratedCode';
import { prepareShippableHtml } from '@/lib/ship-html';
import type { ProjectFile } from '@/lib/project-files';

/**
 * HTML safe to publish as a live preview link — cleaned + static Tailwind CSS inlined.
 * No editor injection scripts, no preview iframe scaffolding.
 */
export async function getDeployablePreviewHtml(
  generatedCode: string,
  projectFiles: ProjectFile[],
  activePage = 'index.html'
): Promise<string> {
  const content =
    projectFiles.find((f) => f.path === activePage)?.content?.trim() ||
    (activePage === 'index.html' ? generatedCode : '');
  const raw =
    content ||
    projectFiles.find((f) => f.path === 'index.html')?.content?.trim() ||
    generatedCode;

  const cleaned = cleanGeneratedCode(raw);
  const { html } = await prepareShippableHtml(cleaned, { cssMode: 'inline' });
  return html;
}
