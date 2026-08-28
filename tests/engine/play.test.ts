import { beforeAll, describe, expect, it } from 'vitest';
import type { CandidateClub } from '../../src/engine/market.js';
import { decisionKey, playCareer, type CareerSave } from '../../src/engine/play.js';
import { SAVE_VERSION } from '../../src/engine/save.js';
import { createFileWorldSource } from '../../src/world/fileSource.js';

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
        clubs.push({ club, leagueId: league.id, leagueName: league.name, leagueLevel: league.level });
      }
    }
    save = {
      version: SAVE_VERSION,
      seed: 2026,
      create: { name: 'Diego', nationality: 'Italy', role: 'FWD', age: 17, leagueLevel: 1 },
      startClubId: clubs[0]!.club.id,
      decisions: { training: {}, dilemmas: {}, transfers: {} },
    };
  });

  it('una carriera appena creata chiede subito la preparazione', () => {
    const state = playCareer(save, clubs);
    expect(state.pending?.kind).toBe('training');
    expect(state.pending?.season).toBe(1);
    expect(state.seasons).toHaveLength(0);
    expect(state.finished).toBe(false);
  });

  it('scelta la preparazione, il gioco chiede la decisione successiva della stessa stagione', () => {
    const withTraining: CareerSave = {
      ...save,
      decisions: { ...save.decisions, training: { '1': 'tecnica' } },
    };
    const state = playCareer(withTraining, clubs);
    // La stagione si chiude solo dopo i bivi: qui il motore è già dentro l'annata,
    // e chiede la prossima decisione portando con sé com'è andata fin lì.
    expect(state.pending?.kind).not.toBe('training');
    if (state.pending?.kind === 'dilemma') {
      expect(state.pending.soFar.clubName.length).toBeGreaterThan(1);
      expect(state.pending.soFar.stats.appearances).toBeGreaterThanOrEqual(0);
    }
  });

  it('chi decide vede sempre com\'è andata la stagione prima di scegliere', () => {
    let current: CareerSave = { ...save, decisions: { ...save.decisions, training: { '1': 'tecnica' } } };
    let state = playCareer(current, clubs);
    for (let guard = 0; guard < 30; guard += 1) {
      const pending = state.pending;
      if (!pending || pending.kind === 'dilemma') break;
      if (pending.kind === 'training') {
        current = { ...current, decisions: { ...current.decisions, training: { ...current.decisions.training, [String(pending.season)]: 'tecnica' } } };
      } else {
        current = { ...current, decisions: { ...current.decisions, transfers: { ...current.decisions.transfers, [String(pending.season)]: 'resta' } } };
      }
      state = playCareer(current, clubs);
    }
    expect(state.pending?.kind).toBe('dilemma');
    if (state.pending?.kind === 'dilemma') {
      const soFar = state.pending.soFar;
      expect(soFar.position).toBeGreaterThanOrEqual(1);
      expect(soFar.minutesShare).toBeGreaterThan(0);
      expect(soFar.leagueName.length).toBeGreaterThan(1);
    }
  });

  it('la stessa scelta produce sempre la stessa carriera', () => {
    const decided: CareerSave = {
      ...save,
      decisions: { ...save.decisions, training: { '1': 'fisico' } },
    };
    expect(JSON.stringify(playCareer(decided, clubs)))
      .toBe(JSON.stringify(playCareer(decided, clubs)));
  });

  it('cambiare una decisione cambia la carriera da lì in avanti', () => {
    // Si gioca la stessa carriera due volte, cambiando solo la preparazione del primo anno.
    const play = (axis: 'tecnica' | 'leadership'): string => {
      let current: CareerSave = { ...save, decisions: { training: { '1': axis }, dilemmas: {}, transfers: {} } };
      let state = playCareer(current, clubs);
      for (let guard = 0; guard < 60 && !state.finished; guard += 1) {
        const pending = state.pending;
        if (!pending) break;
        if (pending.kind === 'training') {
          current = { ...current, decisions: { ...current.decisions, training: { ...current.decisions.training, [String(pending.season)]: 'tecnica' } } };
        } else if (pending.kind === 'dilemma') {
          current = { ...current, decisions: { ...current.decisions, dilemmas: { ...current.decisions.dilemmas, [decisionKey(pending.season, pending.dilemma.id)]: pending.dilemma.options[0]!.id } } };
        } else {
          current = { ...current, decisions: { ...current.decisions, transfers: { ...current.decisions.transfers, [String(pending.season)]: 'resta' } } };
        }
        state = playCareer(current, clubs);
        if (state.seasons.length >= 3) break;
      }
      return JSON.stringify(state.seasons);
    };
    expect(play('tecnica')).not.toBe(play('leadership'));
  });

  it('con tutte le decisioni prese la carriera arriva in fondo', () => {
    let current = save;
    let state = playCareer(current, clubs);
    let sawDilemma = false;
    let sawTransfer = false;

    for (let guard = 0; guard < 400 && !state.finished; guard += 1) {
      const pending = state.pending;
      if (!pending) break;
      if (pending.kind === 'training') {
        current = { ...current, decisions: { ...current.decisions, training: { ...current.decisions.training, [String(pending.season)]: 'tecnica' } } };
      } else if (pending.kind === 'dilemma') {
        sawDilemma = true;
        current = { ...current, decisions: { ...current.decisions, dilemmas: { ...current.decisions.dilemmas, [decisionKey(pending.season, pending.dilemma.id)]: pending.dilemma.options[0]!.id } } };
      } else {
        sawTransfer = true;
        current = { ...current, decisions: { ...current.decisions, transfers: { ...current.decisions.transfers, [String(pending.season)]: 'resta' } } };
      }
      state = playCareer(current, clubs);
    }

    expect(state.finished).toBe(true);
    expect(state.pending).toBeNull();
    expect(state.result?.goat.total).toBeGreaterThan(0);
    // Lungo il percorso il motore deve aver chiesto sia bivi sia mercato.
    expect(sawDilemma).toBe(true);
    expect(sawTransfer).toBe(true);
  });

  it('i bivi arrivano con titolo, testo e almeno due strade dichiarate', () => {
    let current: CareerSave = { ...save, decisions: { ...save.decisions, training: { '1': 'tecnica' } } };
    let state = playCareer(current, clubs);
    for (let guard = 0; guard < 30 && state.pending?.kind !== 'dilemma'; guard += 1) {
      const pending = state.pending;
      if (!pending) break;
      if (pending.kind === 'training') {
        current = { ...current, decisions: { ...current.decisions, training: { ...current.decisions.training, [String(pending.season)]: 'tecnica' } } };
      } else if (pending.kind === 'transfer') {
        current = { ...current, decisions: { ...current.decisions, transfers: { ...current.decisions.transfers, [String(pending.season)]: 'resta' } } };
      }
      state = playCareer(current, clubs);
    }
    expect(state.pending?.kind).toBe('dilemma');
    if (state.pending?.kind === 'dilemma') {
      expect(state.pending.dilemma.title.length).toBeGreaterThan(3);
      expect(state.pending.dilemma.options.length).toBeGreaterThanOrEqual(2);
      for (const option of state.pending.dilemma.options) {
        expect(option.stake.length).toBeGreaterThan(10);
      }
    }
  });

  it('rigiocare è abbastanza veloce da farlo a ogni click', () => {
    const start = performance.now();
    for (let i = 0; i < 20; i += 1) playCareer(save, clubs);
    expect(performance.now() - start).toBeLessThan(1000);
  });
});
