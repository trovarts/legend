import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'LEGGENDA — simulatore di carriera calcistica',
  description:
    "Crea un calciatore e vivi la sua carriera dal primo contratto al ritiro: squadre vere, decisioni che pesano, un rivale che ti insegue per vent'anni.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
