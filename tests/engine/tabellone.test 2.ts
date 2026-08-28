import { describe, expect, it } from 'vitest';
import { buildCupBracket } from '../../src/engine/cup';
import { leagueTable } from '../../src/engine/standings';
import { createRng } from '../../src/engine/rng';
import type { Club, Role, WorldPlayer } from '../../src/world/types';

function club(id: string, name: string, overall: number): Club {
  const squad: WorldPlayer[] = Array.from({ length: 20 }, (_, index) => ({
    id: `${id}p${index}`, name: `G${index}`, age: 26,
    role: (['GK', 'DEF', 'MID', 'FWD'] as const)[index % 4] as Role,
    overall, potential: overall, valueEur: 1_000_000, nationality: 'Italy',
  }));
  return { id, name, squad };
}

const clubs = Array.from({ length: 20 }, (_, i) => club(`c${i}`, `Squadra ${i}`, 80 - i));

describe('leagueTable', () => {
  it('mette il club del giocatore esattamente nella posizione raggiunta', () => {
    for (const posizione of [1, 5, 12, 20]) {
      const table = leagueTable(clubs, 'c7', posizione, createRng(posizione));
      expect(table[posizione - 1]?.clubId).toBe('c7');
      expect(table[posizione - 1]?.isPlayer).toBe(true);
    }
  });

  it('elenca tutte le squadre una volta sola', () => {
    const table = leagueTable(clubs, 'c3', 4, createRng(1));
    expect(table).toHaveLength(clubs.length);
    expect(new Set(table.map((row) => row.clubId)).size).toBe(clubs.length);
  });

  it('i punti scendono lungo la classifica', () => {
    const table = leagueTable(clubs, 'c3', 4, createRng(2));
    expect(table[0]!.points).toBeGreaterThan(table.at(-1)!.points + 20);
  });

  it('è deterministica', () => {
    expect(leagueTable(clubs, 'c3', 4, createRng(9)))
      .toEqual(leagueTable(clubs, 'c3', 4, createRng(9)));
  });
});

describe('buildCupBracket', () => {
  it('chi vince la coppa compare in finale e la porta a casa', () => {
    const bracket = buildCupBracket('Coppa', clubs, 'c2', true, createRng(1));
    expect(bracket.reached).toBe('vittoria');
    expect(bracket.winner).toBe('Squadra 2');
    const finale = bracket.ties.filter((tie) => tie.round === 'finale');
    expect(finale).toHaveLength(1);
    expect(finale[0]!.playerInvolved).toBe(true);
  });

  it('chi non vince esce a un certo turno, e da lì non gioca più', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const bracket = buildCupBracket('Coppa', clubs, 'c2', false, createRng(seed));
      expect(bracket.reached).not.toBe('vittoria');
      const suoi = bracket.ties.filter((tie) => tie.playerInvolved);
      expect(suoi.length).toBeGreaterThanOrEqual(1);
      // L'ultima partita giocata dal club del giocatore è quella che ha perso.
      const ultima = suoi.at(-1)!;
      const suoiGol = ultima.home === 'Squadra 2' ? ultima.homeGoals : ultima.awayGoals;
      const altri = ultima.home === 'Squadra 2' ? ultima.awayGoals : ultima.homeGoals;
      expect(suoiGol).toBeLessThan(altri);
    }
  });

  it('ogni partita ha un vincitore: niente pareggi in coppa', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      for (const tie of buildCupBracket('Coppa', clubs, 'c2', seed % 2 === 0, createRng(seed)).ties) {
        expect(tie.homeGoals).not.toBe(tie.awayGoals);
      }
    }
  });

  it('è deterministico', () => {
    expect(buildCupBracket('Coppa', clubs, 'c2', true, createRng(5)))
      .toEqual(buildCupBracket('Coppa', clubs, 'c2', true, createRng(5)));
  });
});
