import { describe, expect, it } from 'vitest';
import { TRAINING_AXES, trainingEffect } from '../../src/engine/training';

describe('gli assi di allenamento', () => {
  it('sono quattro, come dice la specifica', () => {
    expect(TRAINING_AXES).toHaveLength(4);
    expect(TRAINING_AXES.map((axis) => axis.id)).toEqual(['tecnica', 'fisico', 'testa', 'leadership']);
  });

  it('ognuno dichiara cosa promette, in italiano', () => {
    for (const axis of TRAINING_AXES) {
      expect(axis.label.length).toBeGreaterThan(3);
      expect(axis.promise.length).toBeGreaterThan(15);
    }
  });

  it('la tecnica accelera la crescita e non tocca il resto', () => {
    const effect = trainingEffect('tecnica');
    expect(effect.growthMultiplier).toBeGreaterThan(1);
    expect(effect.physiqueDelta).toBe(0);
    expect(effect.minutesDelta).toBe(0);
  });

  it('il fisico irrobustisce e basta', () => {
    const effect = trainingEffect('fisico');
    expect(effect.physiqueDelta).toBeGreaterThan(0);
    expect(effect.growthMultiplier).toBe(1);
  });

  it('la testa fa guadagnare la fiducia del mister', () => {
    expect(trainingEffect('testa').minutesDelta).toBeGreaterThan(0);
  });

  it('la leadership può far diventare un punto di riferimento', () => {
    expect(trainingEffect('leadership').leadershipChance).toBeGreaterThan(0);
  });

  it('nessun asse è gratis: ognuno rinuncia a quello che danno gli altri', () => {
    for (const axis of TRAINING_AXES) {
      const effect = trainingEffect(axis.id);
      const total =
        (effect.growthMultiplier - 1) + effect.physiqueDelta / 10 +
        effect.minutesDelta * 2 + effect.leadershipChance;
      expect(total).toBeGreaterThan(0.1);
      expect(total).toBeLessThan(0.6);
    }
  });
});
