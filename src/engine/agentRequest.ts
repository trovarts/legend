import type { Agent } from './agent';

/** Che tipo di porte vuoi che l'agente vada a bussare. */
export type RequestKind = 'campionato' | 'titolarita' | 'soldi' | 'vetrina';

export interface AgentRequest {
  kind: RequestKind;
  /** Campionato preferito, se ne è stato indicato uno. */
  leagueId?: string;
}

export const REQUEST_KINDS: readonly { id: RequestKind; label: string; text: string }[] = [
  {
    id: 'campionato',
    label: 'Un campionato preciso',
    text: 'Dimmi dove vuoi giocare e vado a cercare lì, anche se costa qualcosa.',
  },
  {
    id: 'titolarita',
    label: 'Un posto da titolare',
    text: 'Meno vetrina, più campo: ti porto dove giochi tutte le domeniche.',
  },
  {
    id: 'soldi',
    label: 'Il contratto migliore',
    text: 'Vado dove pagano di più. Il resto viene dopo.',
  },
  {
    id: 'vetrina',
    label: 'Il club più forte',
    text: 'Punto in alto: se ti prendono, ti prendono davvero.',
  },
];

export interface RequestEffect {
  /** Quanti minuti attesi in più contano nella scelta delle offerte. */
  minutesBias: number;
  /** Quanto conta la forza del club. */
  strengthBias: number;
  /** Quanto conta l'ingaggio. */
  wageBias: number;
  /** Offerte in più che l'agente riesce a portare. */
  extraOffers: number;
}

export function requestEffect(request: AgentRequest | undefined, agent: Agent): RequestEffect {
  const base: RequestEffect = { minutesBias: 0, strengthBias: 0, wageBias: 0, extraOffers: 0 };
  if (!request) return base;

  // Un agente più forte riesce davvero a orientare la ricerca; uno alle prime armi meno.
  const peso = 0.4 + agent.stars * 0.15;
  switch (request.kind) {
    case 'titolarita': return { ...base, minutesBias: peso, extraOffers: 1 };
    case 'vetrina': return { ...base, strengthBias: peso };
    case 'soldi': return { ...base, wageBias: peso };
    case 'campionato': return { ...base, extraOffers: 1 };
    default: return base;
  }
}
