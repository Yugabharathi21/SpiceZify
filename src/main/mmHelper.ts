// Thin wrapper to safely get music-metadata's parseFile across ESM/CJS builds
export async function parseFileSafe(filePath: string): Promise<any> {
  // Dynamically import so bundlers/resolvers choose correct entry
  const mod: any = await import('music-metadata');

  // Preferred: direct parseFile export
  if (typeof mod.parseFile === 'function') {
    return mod.parseFile(filePath);
  }

  // Fallback: package exposes loader for CommonJS require interoperability
  if (typeof mod.loadMusicMetadata === 'function') {
    const loader = await mod.loadMusicMetadata();
    if (loader && typeof loader.parseFile === 'function') {
      return loader.parseFile(filePath);
    }
  }

  throw new Error('music-metadata: parseFile not available');
}
