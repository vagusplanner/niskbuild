import 'server-only';

import archiver from 'archiver';
import { PassThrough } from 'stream';

/** Create a ZIP buffer from a directory tree (archiver-based). */
export async function zipDirectoryToBuffer(dirPath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const passthrough = new PassThrough();

    passthrough.on('data', (chunk: Buffer) => chunks.push(chunk));
    passthrough.on('end', () => resolve(Buffer.concat(chunks)));
    passthrough.on('error', reject);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', reject);
    archive.pipe(passthrough);
    archive.directory(dirPath, false);
    void archive.finalize();
  });
}
