import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

export async function POST(request: NextRequest) {
  try {
    const { code, prompt } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'No code to export' }, { status: 400 });
    }

    // Create a ZIP file
    const zip = new JSZip();
    
    zip.file("generated-app/README.md", `# NiskBuild Generated App\n\nGenerated from: "${prompt?.substring(0, 100) || 'Unknown prompt'}"\n\nDate: ${new Date().toISOString()}\n\n## How to use\n1. Extract this ZIP\n2. Open the code in your editor\n3. Run locally or deploy\n\n---\nBuilt with NiskBuild - Local-first, privacy-first AI builder\n`);
    
    zip.file("generated-app/src/code.txt", code);
    
    const htmlWrapper = `<!DOCTYPE html>
<html>
<head>
    <title>NiskBuild App</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: system-ui, monospace; background: #0B0F19; color: #e2e8f0; padding: 2rem; }
        pre { background: #1a1f2e; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>📦 NiskBuild Export</h1>
    <p>Generated from: ${prompt?.substring(0, 100) || 'Unknown prompt'}</p>
    <pre>${code.substring(0, 2000)}...</pre>
    <hr>
    <p><small>Built with NiskBuild - Your code, your ownership, no lock-in.</small></p>
</body>
</html>`;
    
    zip.file("generated-app/preview.html", htmlWrapper);
    
    // Generate the ZIP file as a buffer
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    
    // ✅ THE FIX: Convert Buffer to Uint8Array
    const zipData = new Uint8Array(zipBuffer);
    
    // Return as downloadable file
    return new NextResponse(zipData, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="niskbuild-export-${Date.now()}.zip"`,
      },
    });
    
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to create ZIP file: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}