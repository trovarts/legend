import type { Rng } from './rng';

/**
 * L'agente si sceglie all'inizio e ti accompagna per tutta la carriera: decide quante
 * porte si aprono, quanto in alto puntano, e quanto presto puoi andartene.
 */
export interface Agent {
  id: string;
  name: string;
  country: string;
  /** Da 1 a 5: quanto è forte sul mercato. */
  stars: number;
  motto: string;
  /** Quante offerte porta ogni estate, al massimo. */
  maxOffers: number;
  /** Il club più forte a cui riesce ad arrivare. */
  ceilingOverall: number;
  /** Bonus di reputazione: entra nell'interesse dei club. */
  reputation: number;
  /** Con quanti anni di contratto residui riesce comunque a farti partire. */
  exitYears: number;
}

export const AGENTS: readonly Agent[] = [
  {
    id: 'costa', name: 'Inês Costa', country: 'Portugal', stars: 1,
    motto: 'Costruisce carriere senza bruciare le tappe.',
    maxOffers: 2, ceilingOverall: 78, reputation: 0, exitYears: 2,
  },
  {
    id: 'diallo', name: 'Amina Diallo', country: 'Senegal', stars: 2,
    motto: 'Collega talenti emergenti a progetti ambiziosi.',
    maxOffers: 3, ceilingOverall: 84, reputation: 0.1, exitYears: 3,
  },
  {
    id: 'petrescu', name: 'Sofia Petrescu', country: 'Romania', stars: 2,
    motto: 'Trattative rapide e attenzione alla titolarità.',
    maxOffers: 3, ceilingOverall: 84, reputation: 0.1, exitYears: 3,
  },
  {
    id: 'moreau', name: 'Julien Moreau', country: 'France', stars: 3,
    motto: 'Poche parole, contratti che pesano.',
    maxOffers: 4, ceilingOverall: 90, reputation: 0.2, exitYears: 3,
  },
];

/** Tre agenti fra cui scegliere, sempre diversi, sempre gli stessi a parità di seed. */
export function offerAgents(rng: Rng): Agent[] {
  const pool = [...AGENTS];
  const scelti: Agent[] = [];
  while (scelti.length < 3 && pool.length > 0) {
    scelti.push(...pool.splice(rng.int(0, pool.length - 1), 1));
  }
  return scelti;
}

export function agentById(id: string): Agent | undefined {
  return AGENTS.find((agent) => agent.id === id);
}
