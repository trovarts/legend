import type { NextConfig } from 'next';

/**
 * Dove finirà il sito. Vuoto se sta alla radice di un dominio (Netlify, Cloudflare,
 * un sito utente di GitHub); "/leggenda" se sta in una sottocartella, come nei siti
 * di progetto di GitHub Pages. Si passa dalla riga di comando: BASE_PATH=/leggenda npm run build
 */
const base = process.env.BASE_PATH ?? '';

const config: NextConfig = {
  // Sito completamente statico: nessun server, pubblicabile ovunque (spec §5.3).
  output: 'export',
  // Ogni pagina è una cartella con dentro index.html: è l'unica forma che ogni
  // hosting statico serve allo stesso modo, senza regole di riscrittura.
  trailingSlash: true,
  ...(base === '' ? {} : { basePath: base, assetPrefix: base }),
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: base },
};

export default config;
