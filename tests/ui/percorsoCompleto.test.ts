import { beforeAll, describe, expect, it } from 'vitest';
import type { CandidateClub } from '../../src/engine/market';
import { decisionKey, playCareer, type CareerSave } from '../../src/engine/play';
import { decodeSave, encodeSave } from '../../src/engine/save';
import { createFileWorldSource } from '../../src/world/fileSource';

/**
 * Il percorso completo, come lo vive chi gioca: agente, vivaio, salto in prima
 * squadra, ritiro, bivi, mercato, fino al ritiro. Ogni schermata dell'interfaccia
 * nasce da uno di questi `pending`: se la catena si spezza, il gioco si blocca su
 * una pagina bianca — ed è successo davvero, riaprendo una carriera di quarta serie.
 */
describe('il percorso completo di una carriera', () => {
  let clubs: CandidateClub[];
  let partenza: CandidateClub;

  beforeAll(async () => {
    const source = createFileWorldSource('public/world');
    const tutte = await source.listLeagues();
    const scelte = [
      ...tutte.filter((lega) => lega.country === 'Italy'),
      ...tutte.filter((lega) => lega.country !== 'Italy').slice(0, 6),
    ];
    clubs = [];
    for (const lega of scelte) {
      const bundle = await source.loadLeague(lega.id);
      for (const club of bundle.clubs) {
        clubs.push({
          club, leagueId: lega.id, leagueName: lega.name,
          leagueLevel: lega.level, country: lega.country,
        });
      }
    }
    partenza = clubs.find((entry) => entry.leagueLevel === 4)!;
  });

  function nuova(seed: number): CareerSave {
    return {
      version: 1,
      seed,
      create: { name: 'Diego', nationality: 'Italy', role: 'FWD', age: 14, leagueLevel: 4 },
      startClubId: partenza.club.id,
      decisions: { training: {}, dilemmas: {}, transfers: {} },
    };
  }

  /** Gioca fino alla fine prendendo sempre la prima opzione, e annota cosa ha visto. */
  function gioca(seed: number): { save: CareerSave; visti: Set<string>; stato: ReturnType<typeof playCareer> } {
    let save = nuova(seed);
    const visti = new Set<string>();
    let stato = playCareer(save, clubs);

    for (let passi = 0; passi < 500 && !stato.finished; passi += 1) {
      const pending = stato.pending;
      if (pending === null) break;
      visti.add(pending.kind);
      const decisions = { ...save.decisions };

      if (pending.kind === 'agent') decisions.agentId = pending.options[0]!.id;
      else if (pending.kind === 'youth') {
        decisions.youth = { ...decisions.youth, [String(pending.year)]: 'piano-completo' };
      } else if (pending.kind === 'promotion') decisions.promotedAt = stato.youth.length;
      else if (pending.kind === 'training') {
        decisions.training = { ...decisions.training, [String(pending.season)]: 'tecnica' };
      } else if (pending.kind === 'dilemma') {
        decisions.dilemmas = {
          ...decisions.dilemmas,
          [decisionKey(pending.season, pending.dilemma.id)]: pending.dilemma.options[0]!.id,
        };
      } else {
        decisions.transfers = {
          ...decisions.transfers,
          [String(pending.season)]: pending.offers[0]?.clubId ?? 'resta',
        };
      }

      save = { ...save, decisions };
      stato = playCareer(save, clubs);
    }

    return { save, visti, stato };
  }

  it('passa da tutte le decisioni e arriva al ritiro', () => {
    const { visti, stato } = gioca(31);

    expect(visti.has('agent')).toBe(true);
    expect(visti.has('youth')).toBe(true);
    expect(visti.has('promotion')).toBe(true);
    expect(visti.has('training')).toBe(true);
    expect(visti.has('dilemma')).toBe(true);
    expect(visti.has('transfer')).toBe(true);

    expect(stato.finished).toBe(true);
    expect(stato.result).not.toBeNull();
    expect(stato.youth.length).toBeGreaterThan(0);
    expect(stato.seasons.length).toBeGreaterThan(8);
    expect(stato.result!.goat.total).toBeGreaterThan(0);
    expect(stato.result!.retiredAt).toBeGreaterThan(28);
  });

  it('dal vivaio alla prima squadra i numeri non ripartono da capo', () => {
    const { stato } = gioca(31);
    const ultimoVivaio = stato.youth[stato.youth.length - 1]!;
    const prima = stato.seasons[0]!;

    expect(prima.age).toBe(ultimoVivaio.age + 1);
    expect(prima.overallStart).toBe(ultimoVivaio.overallEnd);
  });

  it('nessuna stagione finisce in una posizione che non esiste', () => {
    const perLega = new Map<string, number>();
    for (const entry of clubs) perLega.set(entry.leagueId, (perLega.get(entry.leagueId) ?? 0) + 1);

    for (const seed of [4, 31, 77]) {
      for (const stagione of gioca(seed).stato.seasons) {
        expect(stagione.position).toBeGreaterThanOrEqual(1);
        expect(stagione.position).toBeLessThanOrEqual(perLega.get(stagione.leagueId) ?? 0);
      }
    }
  });

  it('il codice della carriera restituisce la stessa identica carriera', () => {
    const { save, stato } = gioca(31);
    const riletto = decodeSave(encodeSave(save));
    expect(riletto).not.toBeNull();

    const ripetuto = playCareer(riletto!, clubs);
    expect(ripetuto.seasons).toEqual(stato.seasons);
    expect(ripetuto.result?.goat.total).toBe(stato.result?.goat.total);
  });
});
