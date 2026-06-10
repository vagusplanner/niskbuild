/**
 * Strips markdown fences and ensures preview-ready HTML for the iframe.
 */
export function cleanGeneratedCode(rawCode: string): string {
  let cleaned = rawCode.trim();

  const markdownMatch = cleaned.match(/```(?:html|javascript|jsx|tsx|typescript|css)?\n?([\s\S]*?)\n?```/i);
  if (markdownMatch) {
    cleaned = markdownMatch[1].trim();
  }

  const doctypeMatch = cleaned.match(/(<!DOCTYPE[\s\S]*<\/html>)/i);
  if (doctypeMatch) {
    return doctypeMatch[1];
  }

  if (cleaned.includes('<html') || cleaned.includes('<!DOCTYPE')) {
    return cleaned;
  }

  // Wrap plain HTML fragments or text in a full document for preview
  if (cleaned.includes('<body') || cleaned.includes('<div') || cleaned.includes('<section')) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NiskBuild App</title>
</head>
${cleaned.includes('<body') ? cleaned : `<body>${cleaned}</body>`}
</html>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NiskBuild App</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #0B0F19 0%, #1a1f2e 100%);
      color: #e2e8f0;
      padding: 2rem;
      min-height: 100vh;
    }
    pre {
      background: #0B0F19;
      padding: 1rem;
      border-radius: 8px;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <h1>🚀 NiskBuild Generated App</h1>
  <pre>${cleaned.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>`;
}

export function isExportableCode(code: string): boolean {
  if (!code || code.length < 20) return false;
  const blocked = [
    'will appear here',
    'Generating...',
    'NiskBuild AI is working',
    '// Error:',
    '❌ Generation failed',
  ];
  return !blocked.some((s) => code.includes(s));
}
