import type { ProjectSeoSettings } from '@/lib/seo-types';

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

export function injectSeoIntoHtml(html: string, seo: ProjectSeoSettings): string {
  if (!html?.trim()) return html;

  let result = html;
  const tags: string[] = [];

  if (seo.title.trim()) {
    tags.push(`<title>${escapeAttr(seo.title.trim())}</title>`);
    tags.push(`<meta name="title" content="${escapeAttr(seo.title.trim())}">`);
  }
  if (seo.metaDescription.trim()) {
    tags.push(
      `<meta name="description" content="${escapeAttr(seo.metaDescription.trim())}">`
    );
  }
  if (seo.focusKeyword.trim()) {
    tags.push(`<meta name="keywords" content="${escapeAttr(seo.focusKeyword.trim())}">`);
  }
  if (seo.canonicalUrl.trim()) {
    tags.push(`<link rel="canonical" href="${escapeAttr(seo.canonicalUrl.trim())}">`);
  }
  if (seo.noindex) {
    tags.push('<meta name="robots" content="noindex, nofollow">');
  } else if (seo.robotsEnabled) {
    tags.push('<meta name="robots" content="index, follow">');
  }

  if (seo.ogTitle.trim()) {
    tags.push(`<meta property="og:title" content="${escapeAttr(seo.ogTitle.trim())}">`);
  }
  if (seo.ogDescription.trim()) {
    tags.push(
      `<meta property="og:description" content="${escapeAttr(seo.ogDescription.trim())}">`
    );
  }
  if (seo.ogImageUrl.trim()) {
    tags.push(`<meta property="og:image" content="${escapeAttr(seo.ogImageUrl.trim())}">`);
  }
  tags.push('<meta property="og:type" content="website">');

  if (seo.schemaJson && Object.keys(seo.schemaJson).length > 0) {
    tags.push(
      `<script type="application/ld+json">${JSON.stringify(seo.schemaJson)}</script>`
    );
  }

  const block = tags.join('\n  ');

  if (/<head[^>]*>/i.test(result)) {
    result = result.replace(/<head([^>]*)>/i, `<head$1>\n  ${block}\n`);
  } else if (/<html[^>]*>/i.test(result)) {
    result = result.replace(/<html([^>]*)>/i, `<html$1>\n<head>\n  ${block}\n</head>`);
  } else {
    result = `<!DOCTYPE html>\n<html>\n<head>\n  ${block}\n</head>\n<body>\n${result}\n</body>\n</html>`;
  }

  return result;
}

export function buildSitemapXml(baseUrl: string, paths: string[] = ['/', '/index.html']): string {
  const origin = baseUrl.replace(/\/$/, '');
  const unique = [...new Set(paths)];
  const urls = unique
    .map(
      (path) => `  <url>\n    <loc>${origin}${path.startsWith('/') ? path : `/${path}`}</loc>\n  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function buildRobotsTxt(allowAll: boolean, sitemapUrl?: string): string {
  const lines = allowAll ? ['User-agent: *', 'Allow: /'] : ['User-agent: *', 'Disallow: /'];
  if (sitemapUrl) lines.push(`Sitemap: ${sitemapUrl}`);
  return `${lines.join('\n')}\n`;
}
