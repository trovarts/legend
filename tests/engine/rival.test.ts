import { describe, expect, it } from 'vitest';
import { advanceRival, createRival, rivalSeed } from '../../src/engine/rival';
import type { CandidateClub } from '../../src/engine/market';
import type { Club, Role, WorldPlayer } from '../../src/world/types';

function club(id: string, name: string, league: string, level: number, overall: number): CandidateClub {
  const squad: WorldPlayer[] = Array.from({ length: 22 }, (_, index) => ({
    id: `${id}p${index}`, name: `G${index}`, age: 26,
    role: (['GK', 'DEF', 'MID', 'FWD'] as const)[index % 4] as Role,
    overall, potential: overall, valueEur: 1_000_000, nationality: 'Italy',
  }));
  const value: Club = { id, name, squad };
  return { club: value, leagueId: league, leagueName: league, leagueLevel: level };
}

const clubs: CandidateClub[] = [
  club('a1', 'Alfa', 'lega-italia', 1, 74),
  club('a2', 'Beta', 'lega-italia', 1, 70),
  club('b1', 'Gamma', 'lega-spagna', 1, 73),
  club('b2', 'Delta', 'lega-spagna', 1, 69),
];

const input = {
  playerRole: 'FWD' as Role, playerAge: 17, playerLeagueId: 'lega-italia', clubs, seed: 42,
};

describe('createRival', () => {
  it('nasce con lo stesso ruolo e la stessa età del giocatore', () => {
    const rival = createRival(input);
    expect(rival.player.role).toBe('FWD');
    expect(rival.player.age).toBe(17);
  });

  it('nasce in un campionato diverso dal tuo', () => {
    for (let seed = 0; seed < 50; seed += 1) {
      expect(createRival({ ...input, seed }).club.leagueId).not.toBe('lega-italia');
    }
  });

  it('ha un nome proprio', () => {
    expect(createRival(input).name.length).toBeGreaterThan(2);
  });

  it('parte con un contratto e senza stagioni giocate', () => {
    const rival = createRival(input);
    expect(rival.seasons).toHaveLength(0);
    expect(rival.contract.yearsLeft).toBeGreaterThan(0);
  });

  it('è deterministico', () => {
    expect(createRival(input)).toEqual(createRival(input));
  });

  it('seed diversi generano rivali diversi', () => {
    const a = createRival({ ...input, seed: 1 });
    const b = createRival({ ...input, seed: 2 });
    expect(a.player.overall !== b.player.overall || a.club.club.id !== b.club.club.id).toBe(true);
  });
});

describe('advanceRival', () => {
  it('gioca una stagione e invecchia', () => {
    const rival = createRival(input);
    const next = advanceRival(rival, clubs, 1, 42);
    expect(next.seasons).toHaveLength(1);
    expect(next.player.age).toBe(rival.player.age + 1);
  });

  it('non muta lo stato che riceve', () => {
    const rival = createRival(input);
    advanceRival(rival, clubs, 1, 42);
    expect(rival.seasons).toHaveLength(0);
  });

  it("accumula stagioni una dopo l'altra", () => {
    let rival = createRival(input);
    for (let season = 1; season <= 5; season += 1) rival = advanceRival(rival, clubs, season, 42);
    expect(rival.seasons).toHaveLength(5);
    expect(rival.seasons.map((s) => s.season)).toEqual([1, 2, 3, 4, 5]);
  });

  it('è deterministico', () => {
    const a = advanceRival(createRival(input), clubs, 1, 42);
    const b = advanceRival(createRival(input), clubs, 1, 42);
    expect(a).toEqual(b);
  });
});

describe('rivalSeed', () => {
  it('è diverso dal seed della carriera', () => {
    expect(rivalSeed(42)).not.toBe(42);
  });

  it('è stabile', () => {
    expect(rivalSeed(42)).toBe(rivalSeed(42));
  });
});
