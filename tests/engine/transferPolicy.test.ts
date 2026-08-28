import { describe, expect, it } from 'vitest';
import { ambitiousPolicy } from '../../src/engine/market.js';
import type { Offer } from '../../src/engine/types.js';

function offer(over: Partial<Offer>): Offer {
  return {
    clubId: 'c', clubName: 'Club', leagueId: 'lg', leagueName: 'Lega', leagueLevel: 1,
    feeEur: 10_000_000, weeklyWageEur: 40_000, expectedMinutesShare: 0.5, isLoan: false,
    ...over,
  };
}

const context = { currentMinutesShare: 0.5, currentLeagueLevel: 1, age: 24 };

describe('ambitiousPolicy', () => {
  it('senza offerte si resta dove si è', () => {
    expect(ambitiousPolicy([], context)).toBeNull();
  });

  it('chi non gioca accetta di andare dove giocherebbe', () => {
    const chosen = ambitiousPolicy(
      [offer({ clubId: 'gioca', expectedMinutesShare: 0.8, leagueLevel: 2 })],
      { ...context, currentMinutesShare: 0.05 },
    );
    expect(chosen?.clubId).toBe('gioca');
  });

  it('chi è titolare non scende di categoria per giocare uguale', () => {
    const chosen = ambitiousPolicy(
      [offer({ clubId: 'giu', expectedMinutesShare: 0.85, leagueLevel: 3 })],
      { ...context, currentMinutesShare: 0.8, currentLeagueLevel: 1 },
    );
    expect(chosen).toBeNull();
  });

  it('a parità di minuti si sceglie il club più importante', () => {
    const chosen = ambitiousPolicy(
      [
        offer({ clubId: 'piccolo', expectedMinutesShare: 0.7, feeEur: 2_000_000 }),
        offer({ clubId: 'grande', expectedMinutesShare: 0.7, feeEur: 60_000_000 }),
      ],
      context,
    );
    expect(chosen?.clubId).toBe('grande');
  });

  it('non si accetta un club dove si finirebbe in panchina', () => {
    const chosen = ambitiousPolicy(
      [offer({ clubId: 'panchina', expectedMinutesShare: 0.1, feeEur: 90_000_000 })],
      { ...context, currentMinutesShare: 0.7 },
    );
    expect(chosen).toBeNull();
  });

  it('è deterministica: nessuna casualità nella scelta', () => {
    const offers = [
      offer({ clubId: 'a', expectedMinutesShare: 0.6 }),
      offer({ clubId: 'b', expectedMinutesShare: 0.75 }),
    ];
    expect(ambitiousPolicy(offers, context)?.clubId).toBe(ambitiousPolicy(offers, context)?.clubId);
  });
});
