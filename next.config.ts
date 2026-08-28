import type { NextConfig } from 'next';

const config: NextConfig = {
  // Sito completamente statico: nessun server, pubblicabile ovunque (spec §5.3).
  output: 'export',
  images: { unoptimized: true },
};

export default config;
