import { describe, expect, it } from 'vitest';
import { generateOffers, type CandidateClub, type OffersInput } from '../../src/engine/market';
import { createRng } from '../../src/engine/rng';
import type { SeasonStats } from '../../src/engine/types';
import type { Club, Role, WorldPlayer } from '../../src/world/types';

function club(id: string, name: string, overalls: readonly number[]): Club {
  const squad: WorldPlayer[] = overalls.map((overall, index) => ({
    id: `${id}p${index}`, name: `G${index}`, age: 26,
    role: (['GK', 'DEF', 'MID', 'FWD'] as const)[index % 4] as Role,
    overall, potential: overall, valueEur: 1_000_000, nationality: 'Italy',
  }));
  return { id, name, squad };
}

function candidate(id: string, name: string, level: number, overalls: readonly number[]): CandidateClub {
  return { club: club(id, name, overalls), leagueId: `lg-${level}`, leagueName: `Lega ${level}`, leagueLevel: level };
}

const goodSeason: SeasonStats = {
  appearances: 34, minutes: 2900, goals: 18, assists: 7, cleanSheets: 0, rating: 7.6,
};
const benchSeason: SeasonStats = {
  appearances: 5, minutes: 200, goals: 0, assists: 1, cleanSheets: 0, rating: 6.1,
};

const big = candidate('big', 'Grande Club', 1, Array.from({ length: 22 }, () => 84));
const mid = candidate('mid', 'Club Medio', 1, Array.from({ length: 22 }, () => 72));
const small = candidate('small', 'Club Piccolo', 2, Array.from({ length: 22 }, () => 62));

const base: OffersInput = {
  player: { overall: 74, age: 23, potential: 86, role: 'FWD' },
  currentClubId: 'mid',
  currentMinutesShare: 0.8,
  stats: goodSeason,
  candidates: [big, mid, small],
};

describe('generateOffers', () => {
  it('non arrivano offerte dal club in cui già giochi', () => {
    const offers = generateOffers(base, createRng(1));
    expect(offers.some((offer) => offer.clubId === 'mid')).toBe(false);
  });

  it('dopo una grande stagione qualcuno si fa avanti', () => {
    let withOffers = 0;
    for (let seed = 0; seed < 100; seed += 1) {
      if (generateOffers(base, createRng(seed)).length > 0) withOffers += 1;
    }
    expect(withOffers).toBeGreaterThan(60);
  });

  it('ogni offerta dichiara i minuti attesi, e sono credibili', () => {
    for (let seed = 0; seed < 50; seed += 1) {
      for (const offer of generateOffers(base, createRng(seed))) {
        expect(offer.expectedMinutesShare).toBeGreaterThan(0);
        expect(offer.expectedMinutesShare).toBeLessThanOrEqual(0.95);
      }
    }
  });

  it('in un club più forte si giocherebbe di meno', () => {
    const offers = generateOffers(base, createRng(3));
    const fromBig = offers.find((offer) => offer.clubId === 'big');
    const fromSmall = offers.find((offer) => offer.clubId === 'small');
    if (fromBig && fromSmall) {
      expect(fromSmall.expectedMinutesShare).toBeGreaterThan(fromBig.expectedMinutesShare);
    }
  });

  it('un giovane che non gioca riceve proposte di prestito', () => {
    const stuck: OffersInput = {
      player: { overall: 62, age: 19, potential: 88, role: 'FWD' },
      currentClubId: 'big',
      currentMinutesShare: 0.05,
      stats: benchSeason,
      candidates: [big, mid, small],
    };
    let loans = 0;
    for (let seed = 0; seed < 100; seed += 1) {
      if (generateOffers(stuck, createRng(seed)).some((offer) => offer.isLoan)) loans += 1;
    }
    expect(loans).toBeGreaterThan(50);
  });

  it('un trentaseienne in declino riceve poche offerte, e non dai grandi club', () => {
    const veteran: OffersInput = {
      ...base,
      player: { overall: 66, age: 36, potential: 66, role: 'FWD' },
      stats: { ...goodSeason, goals: 6, rating: 6.6 },
    };
    for (let seed = 0; seed < 50; seed += 1) {
      expect(generateOffers(veteran, createRng(seed)).some((o) => o.clubId === 'big')).toBe(false);
    }
  });

  it('il costo del cartellino segue il valore del giocatore', () => {
    const offers = generateOffers(base, createRng(5));
    for (const offer of offers) {
      if (offer.isLoan) continue;
      expect(offer.feeEur).toBeGreaterThan(0);
      expect(offer.weeklyWageEur).toBeGreaterThan(0);
    }
  });

  it('senza club candidati non succede niente', () => {
    expect(generateOffers({ ...base, candidates: [] }, createRng(1))).toEqual([]);
  });

  it('è deterministico', () => {
    expect(generateOffers(base, createRng(7))).toEqual(generateOffers(base, createRng(7)));
  });
});
