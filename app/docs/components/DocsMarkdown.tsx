'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface DocsMarkdownProps {
  content: string;
}

export default function DocsMarkdown({ content }: DocsMarkdownProps) {
  if (!content?.trim()) {
    return (
      <p className="text-nisk-muted text-sm">
        This article has no body content yet. Try refreshing, or contact support if it persists.
      </p>
    );
  }

  return (
    <div className="docs-markdown max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h2 className="text-2xl font-semibold text-[var(--foreground)] mt-0 mb-6 pb-2 border-b border-nisk">
              {children}
            </h2>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold text-[var(--foreground)] mt-10 mb-4 pb-2 border-b border-nisk">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold text-[var(--foreground)] mt-6 mb-3">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="text-nisk-muted leading-relaxed mb-4">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside ml-5 space-y-2 text-nisk-muted mb-4">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="docs-numbered-steps space-y-3 mb-6 list-none pl-0 text-[var(--muted)]">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-[var(--copper-primary)] pl-4 py-1 my-4 text-nisk-muted italic bg-[var(--surface)]/40 rounded-r-lg">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-6 rounded-xl border border-nisk">
              <table className="w-full text-sm text-left">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[var(--surface)] text-[var(--foreground)]">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 font-semibold border-b border-nisk">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 border-b border-nisk/60 text-nisk-muted">{children}</td>
          ),
          code: ({ className, children }) => {
            const isBlock = className?.includes('language-');
            if (isBlock) {
              return (
                <code className="block p-4 rounded-xl bg-[var(--surface-elevated)] border border-nisk text-sm font-mono text-[var(--accent-cyan)] overflow-x-auto my-4">
                  {children}
                </code>
              );
            }
            return (
              <code className="px-1.5 py-0.5 rounded bg-[var(--surface-elevated)] text-[var(--accent-cyan)] text-sm font-mono">
                {children}
              </code>
            );
          },
          strong: ({ children }) => (
            <strong className="font-semibold text-[var(--foreground)]">{children}</strong>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-[var(--copper-melt)] underline underline-offset-2 hover:text-[var(--copper-primary)]"
              target={href?.startsWith('http') ? '_blank' : undefined}
              rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      <style jsx global>{`
        .docs-numbered-steps {
          counter-reset: docs-step;
        }
        .docs-numbered-steps > li {
          counter-increment: docs-step;
          position: relative;
          padding: 0.75rem 0.75rem 0.75rem 3rem;
          border-radius: 0.75rem;
          border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
          background: color-mix(in srgb, var(--surface) 60%, transparent);
          color: var(--muted, #8a7d6e);
        }
        .docs-numbered-steps > li strong {
          color: var(--foreground, #e8dcc8);
        }
        .docs-numbered-steps > li::before {
          content: counter(docs-step);
          position: absolute;
          left: 0.75rem;
          top: 0.75rem;
          width: 1.75rem;
          height: 1.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--copper-melt);
          border: 1px solid color-mix(in srgb, var(--copper-primary) 40%, transparent);
          background: color-mix(in srgb, var(--copper-primary) 20%, transparent);
        }
        .docs-numbered-steps > li > p:first-child {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
}
