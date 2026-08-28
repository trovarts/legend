'use client';

export interface Aspetto {
  pelle: number;
  capelli: number;
  espressione: number;
  divisa: number;
  scarpini: number;
}

export const PELLI = ['#f2d3b5', '#e0b48c', '#c68a5e', '#8d5a3b', '#5b3826'];
export const CAPELLI = ['#1b1614', '#4a2f1d', '#8a5a2b', '#c9a227', '#d8d3cc'];
export const DIVISE = ['#ffffff', '#d81f3f', '#1d4ed8', '#0f7a3d', '#f5c518'];
export const SCARPINI = ['#111111', '#ffffff', '#d81f3f', '#f5c518', '#1d4ed8'];
export const NOMI_PELLE = ['Molto chiara', 'Media chiara', 'Media', 'Scura', 'Molto scura'];
export const NOMI_CAPELLI = ['Corti scuri', 'Castani', 'Biondi', 'Rasati', 'Grigi'];
export const NOMI_ESPRESSIONE = ['Tranquillo', 'Determinato', 'Sorridente'];
export const NOMI_DIVISA = ['Bianca', 'Rossa', 'Blu', 'Verde', 'Gialla'];
export const NOMI_SCARPINI = ['Neri', 'Bianchi', 'Rossi', 'Gialli', 'Blu'];

export const ASPETTO_INIZIALE: Aspetto = {
  pelle: 1, capelli: 0, espressione: 0, divisa: 0, scarpini: 0,
};

/** Il giocatore disegnato: nessuna immagine da scaricare, solo forme. */
export function Avatar({ aspetto, numero }: { aspetto: Aspetto; numero: string }) {
  const pelle = PELLI[aspetto.pelle % PELLI.length]!;
  const capelli = CAPELLI[aspetto.capelli % CAPELLI.length]!;
  const divisa = DIVISE[aspetto.divisa % DIVISE.length]!;
  const scarpini = SCARPINI[aspetto.scarpini % SCARPINI.length]!;
  const sorride = aspetto.espressione % 3;

  return (
    <svg viewBox="0 0 120 200" className="avatar" role="img" aria-label="Il tuo giocatore">
      {/* gambe */}
      <rect x="46" y="128" width="11" height="46" rx="4" fill={pelle} />
      <rect x="63" y="128" width="11" height="46" rx="4" fill={pelle} />
      {/* calzettoni e scarpini */}
      <rect x="45" y="150" width="13" height="26" rx="4" fill="#ffffff" />
      <rect x="62" y="150" width="13" height="26" rx="4" fill="#ffffff" />
      <rect x="42" y="174" width="19" height="9" rx="4" fill={scarpini} />
      <rect x="59" y="174" width="19" height="9" rx="4" fill={scarpini} />
      {/* pantaloncini */}
      <rect x="43" y="112" width="34" height="26" rx="6" fill="#ffffff" />
      {/* maglia */}
      <path d="M38 66 h44 l8 12 -12 8 v34 h-36 v-34 l-12 -8 z" fill={divisa} stroke="rgba(0,0,0,.18)" />
      <text x="60" y="104" textAnchor="middle" fontSize="18" fontWeight="700"
        fill={divisa === '#ffffff' ? '#222' : '#fff'}>{numero}</text>
      {/* braccia */}
      <rect x="26" y="70" width="11" height="42" rx="5" fill={pelle} />
      <rect x="83" y="70" width="11" height="42" rx="5" fill={pelle} />
      {/* testa */}
      <circle cx="60" cy="46" r="20" fill={pelle} />
      <path d="M40 42 a20 20 0 0 1 40 0 q-20 -12 -40 0" fill={capelli} />
      <circle cx="53" cy="46" r="2.2" fill="#20161a" />
      <circle cx="67" cy="46" r="2.2" fill="#20161a" />
      {sorride === 2 && <path d="M52 55 q8 6 16 0" stroke="#20161a" strokeWidth="1.8" fill="none" />}
      {sorride === 1 && <path d="M52 56 h16" stroke="#20161a" strokeWidth="1.8" fill="none" />}
      {sorride === 0 && <path d="M53 55 q7 3 14 0" stroke="#20161a" strokeWidth="1.6" fill="none" />}
    </svg>
  );
}
