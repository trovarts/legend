import { describe, expect, it } from 'vitest';
import { resolveTrophies, type TrophiesInput } from '../../src/engine/competitions';
import { createRng } from '../../src/engine/rng';

const champion: TrophiesInput = {
  season: 5, leagueName: 'Serie A', position: 1, clubCount: 20,
  qualifiedToContinental: true, minutesShare: 0.8,
};

function rate(input: TrophiesInput, kind: string): number {
  let won = 0;
  for (let seed = 0; seed < 1000; seed += 1) {
    if (resolveTrophies(input, createRng(seed)).some((t) => t.kind === kind)) won += 1;
  }
  return won / 1000;
}

describe('resolveTrophies', () => {
  it('chi arriva primo vince il campionato, sempre', () => {
    expect(rate(champion, 'league')).toBe(1);
  });

  it('chi arriva secondo non vince il campionato, mai', () => {
    expect(rate({ ...champion, position: 2 }, 'league')).toBe(0);
  });

  it('il trofeo di campionato porta il nome del campionato', () => {
    const trophies = resolveTrophies(champion, createRng(1));
    const league = trophies.find((t) => t.kind === 'league');
    expect(league?.competitionName).toBe('Serie A');
    expect(league?.season).toBe(5);
  });

  it('la coppa nazionale la vince più spesso chi sta in alto', () => {
    expect(rate(champion, 'nationalCup')).toBeGreaterThan(
      rate({ ...champion, position: 12 }, 'nationalCup'),
    );
  });

  it('la coppa nazionale resta possibile per una squadra di metà classifica', () => {
    const chance = rate({ ...champion, position: 10 }, 'nationalCup');
    expect(chance).toBeGreaterThan(0.01);
    expect(chance).toBeLessThan(0.2);
  });

  it('senza qualificazione non si vince la coppa continentale', () => {
    expect(rate({ ...champion, qualifiedToContinental: false }, 'continental')).toBe(0);
  });

  it('la coppa continentale è rara anche per chi vince il campionato', () => {
    const chance = rate(champion, 'continental');
    expect(chance).toBeGreaterThan(0.02);
    expect(chance).toBeLessThan(0.3);
  });

  it('è deterministico', () => {
    expect(resolveTrophies(champion, createRng(3))).toEqual(
      resolveTrophies(champion, createRng(3)),
    );
  });
});
