import { cleanGeneratedCode } from '@/lib/cleanGeneratedCode';
import type { ProjectFile } from '@/lib/project-files';

/** HTML safe to publish — uses current index.html, no editor injection scripts. */
export function getDeployablePreviewHtml(
  generatedCode: string,
  projectFiles: ProjectFile[],
  activePage = 'index.html'
): string {
  const content =
    projectFiles.find((f) => f.path === activePage)?.content?.trim() ||
    (activePage === 'index.html' ? generatedCode : '');
  if (content) return cleanGeneratedCode(content);
  const indexContent =
    projectFiles.find((f) => f.path === 'index.html')?.content?.trim() || generatedCode;
  return cleanGeneratedCode(indexContent);
}
