import type { DocArticleSummary } from '@/lib/docs/types';
import DocsSidebar from '@/app/docs/components/DocsSidebar';

interface DocsShellProps {
  articles: DocArticleSummary[];
  currentSlug?: string;
  children: React.ReactNode;
}

export default function DocsShell({ articles, currentSlug, children }: DocsShellProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
      <DocsSidebar articles={articles} currentSlug={currentSlug} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
