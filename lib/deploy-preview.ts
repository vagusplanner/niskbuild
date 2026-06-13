import { cleanGeneratedCode } from '@/lib/cleanGeneratedCode';
import type { ProjectFile } from '@/lib/project-files';

/** HTML safe to publish — uses current index.html, no editor injection scripts. */
export function getDeployablePreviewHtml(
  generatedCode: string,
  projectFiles: ProjectFile[]
): string {
  const indexContent =
    projectFiles.find((f) => f.path === 'index.html')?.content?.trim() || generatedCode;
  return cleanGeneratedCode(indexContent);
}
