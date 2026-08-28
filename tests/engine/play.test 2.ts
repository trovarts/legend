import { beforeAll, describe, expect, it } from 'vitest';
import type { CandidateClub } from '../../src/engine/market';
import { decisionKey, playCareer, type CareerSave } from '../../src/engine/play';
import { SAVE_VERSION } from '../../src/engine/save';
import { createFileWorldSource } from '../../src/world/fileSource';

describe('playCareer', () => {
  let clubs: CandidateClub[];
  let save: CareerSave;

  beforeAll(async () => {
    const source = createFileWorldSource('public/world');
    const leagues = await source.listLeagues();
    clubs = [];
    for (const league of leagues.slice(0, 4)) {
      const bundle = await source.loadLeague(league.id);
      for (const club of bundle.clubs) {
        clubs.push({ club, leagueId: league.id, leagueName: league.name, leagueLevel: league.level, country: league.country });
      }
    }
    save = {
      version: SAVE_VERSION,
      seed: 2026,
      create: { name: 'Diego', nationality: 'Italy', role: 'FWD', age: 14, leagueLevel: 1 },
      startClubId: clubs[0]!.club.id,
      decisions: { training: {}, dilemmas: {}, transfers: {} },
    };
  });

  /** Porta la carriera avanti prendendo sempre la prima strada, fino a una condizione. */
  function avanza(fino: (state: ReturnType<typeof playCareer>) => boolean, limite = 400): {
    save: CareerSave;
    state: ReturnType<typeof playCareer>;
  } {
    let corrente = save;
    let state = playCareer(corrente, clubs);
    for (let passo = 0; passo < limite && !fino(state); passo += 1) {
      const pending = state.pending;
      if (!pending) break;
      const d = corrente.decisions;
      if (pending.kind === 'agent') {
        corrente = { ...corrente, decisions: { ...d, agentId: pending.options[0]!.id } };
      } else if (pending.kind === 'youth') {
        corrente = { ...corrente, decisions: { ...d, youth: { ...d.youth, [String(pending.year)]: 'piano-completo' } } };
      } else if (pending.kind === 'promotion') {
        corrente = { ...corrente, decisions: { ...d, promotedAt: 2 } };
      } else if (pending.kind === 'training') {
        corrente = { ...corrente, decisions: { ...d, training: { ...d.training, [String(pending.season)]: 'tecnica' } } };
      } else if (pending.kind === 'dilemma') {
        corrente = {
          ...corrente,
          decisions: {
            ...d,
            dilemmas: { ...d.dilemmas, [decisionKey(pending.season, pending.dilemma.id)]: pending.dilemma.options[0]!.id },
          },
        };
      } else {
        corrente = { ...corrente, decisions: { ...d, transfers: { ...d.transfers, [String(pending.season)]: 'resta' } } };
      }
      state = playCareer(corrente, clubs);
    }
    return { save: corrente, state };
  }

  it('la carriera comincia con la scelta dell\'agente', () => {
    const state = playCareer(save, clubs);
    expect(state.pending?.kind).toBe('agent');
    if (state.pending?.kind === 'agent') {
      expect(state.pending.options).toHaveLength(3);
      expect(state.pending.options[0]!.stars).toBeGreaterThanOrEqual(1);
    }
  });

  it('scelto l\'agente si entra nel vivaio, a quattordici anni', () => {
    const { state } = avanza((s) => s.pending?.kind === 'youth');
    expect(state.pending?.kind).toBe('youth');
    if (state.pending?.kind === 'youth') {
      expect(state.pending.age).toBe(14);
      expect(state.pending.year).toBe(1);
    }
    expect(state.agent).not.toBeNull();
  });

  it('dopo due anni di vivaio il club chiede se salire in prima squadra', () => {
    const { state } = avanza((s) => s.pending?.kind === 'promotion');
    expect(state.pending?.kind).toBe('promotion');
    expect(state.youth.length).toBeGreaterThanOrEqual(1);
    expect(state.youth[0]!.overallEnd).toBeGreaterThanOrEqual(state.youth[0]!.overallStart);
  });

  it('salito in prima squadra si gioca la carriera vera', () => {
    const { state } = avanza((s) => s.seasons.length >= 1);
    expect(state.seasons.length).toBeGreaterThanOrEqual(1);
    expect(state.youth.length).toBeGreaterThan(0);
  });

  it('la carriera arriva in fondo e produce un punteggio', () => {
    const { state } = avanza((s) => s.finished);
    expect(state.finished).toBe(true);
    expect(state.result?.goat.total).toBeGreaterThan(0);
  });

  it('è deterministica dal seed e dalle decisioni', () => {
    const { save: completo } = avanza((s) => s.seasons.length >= 2);
    expect(JSON.stringify(playCareer(completo, clubs)))
      .toBe(JSON.stringify(playCareer(completo, clubs)));
  });

  it('rigiocare è abbastanza veloce da farlo a ogni click', () => {
    const { save: completo } = avanza((s) => s.seasons.length >= 3);
    const start = performance.now();
    for (let i = 0; i < 20; i += 1) playCareer(completo, clubs);
    expect(performance.now() - start).toBeLessThan(1500);
  });
});
