/** Injects a visible watermark banner for preview-only / locked-tier exports */
export function applyExportWatermark(html: string): string {
  const banner = `
<div id="niskbuild-watermark" style="position:fixed;bottom:0;left:0;right:0;z-index:99999;background:linear-gradient(90deg,#22D3EE,#6366F1);color:#050508;text-align:center;padding:8px 12px;font:600 12px system-ui,sans-serif;letter-spacing:0.04em;">
  Built with NiskBuild Sandbox — Upgrade to Pro for clean ZIP exports · <a href="/pricing" style="color:#050508;text-decoration:underline">View Plans</a>
</div>`;

  if (html.includes('</body>')) {
    return html.replace('</body>', `${banner}</body>`);
  }
  return html + banner;
}
