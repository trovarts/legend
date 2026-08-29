import { beforeAll, describe, expect, it } from 'vitest';
import type { CandidateClub } from '../../src/engine/market';
import { decisionKey, playCareer, type CareerSave } from '../../src/engine/play';
import { createRng } from '../../src/engine/rng';
import { SAVE_VERSION } from '../../src/engine/save';
import { YOUTH_EVENT_CATALOG, pickYouthEvent } from '../../src/engine/youthEvents';
import type { YouthSeason } from '../../src/engine/youth';
import { createFileWorldSource } from '../../src/world/fileSource';

const stagioneFinta: YouthSeason = {
  year: 2, age: 15, clubName: 'Club', approach: 'piano-completo',
  appearances: 20, goals: 6, assists: 3, rating: 6.9,
  overallStart: 46, overallEnd: 50, outcomeLabel: '+4 OVR',
};

const contesto = {
  year: 2, age: 15, clubName: 'Club', overall: 50, role: 'FWD' as const,
  approach: 'piano-completo' as const, season: stagioneFinta, usedEventIds: [],
};

describe('il catalogo degli episodi di vivaio', () => {
  it('non ha due episodi con lo stesso id', () => {
    const ids = YOUTH_EVENT_CATALOG.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('dichiara probabilità che fanno uno, come quelle mostrate a schermo', () => {
    for (const entry of YOUTH_EVENT_CATALOG) {
      const dilemma = entry.build(contesto);
      expect(dilemma.options.length).toBeGreaterThanOrEqual(2);
      for (const option of dilemma.options) {
        const somma = option.outcomes.reduce((total, outcome) => total + outcome.chance, 0);
        expect(somma).toBeCloseTo(1, 6);
        expect(option.stake.length).toBeGreaterThan(0);
        for (const outcome of option.outcomes) expect(outcome.text.length).toBeGreaterThan(0);
      }
    }
  });

  it('non ripropone un episodio già capitato', () => {
    const tutti = YOUTH_EVENT_CATALOG.map((entry) => entry.id);
    const scelto = pickYouthEvent({ ...contesto, usedEventIds: tutti }, createRng(7));
    expect(scelto).toBeNull();
  });

  it('a quattordici anni non parla di provini altrove: quel bivio arriva dopo', () => {
    const primoAnno = { ...contesto, year: 1, age: 14 };
    for (let seed = 0; seed < 200; seed += 1) {
      const scelto = pickYouthEvent(primoAnno, createRng(seed));
      expect(scelto?.id).not.toBe('il-provino-altrove');
    }
  });
});

describe('gli episodi dentro una carriera', () => {
  let clubs: CandidateClub[];
  let base: CareerSave;

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
    base = {
      version: SAVE_VERSION,
      seed: 4242,
      create: { name: 'Diego', nationality: 'Italy', role: 'FWD', age: 14, leagueLevel: 1 },
      startClubId: clubs[0]!.club.id,
      decisions: {
        training: {}, dilemmas: {}, transfers: {},
        agentId: 'costa',
        youth: { '1': 'piano-completo', '2': 'piano-completo', '3': 'piano-completo' },
      },
    };
  });

  /** Manda avanti la carriera prendendo sempre la prima strada, fino a una condizione. */
  function avanza(
    partenza: CareerSave,
    fino: (state: ReturnType<typeof playCareer>) => boolean,
    limite = 200,
  ): ReturnType<typeof playCareer> {
    let save = partenza;
    let state = playCareer(save, clubs);
    for (let passo = 0; passo < limite && !fino(state); passo += 1) {
      const pending = state.pending;
      if (pending === null) break;
      const d = { ...save.decisions };
      if (pending.kind === 'agent') d.agentId = pending.options[0]!.id;
      else if (pending.kind === 'youth') d.youth = { ...d.youth, [String(pending.year)]: 'piano-completo' };
      else if (pending.kind === 'youth-event') {
        d.youthEvents = { ...d.youthEvents, [String(pending.year)]: pending.dilemma.options[0]!.id };
      } else if (pending.kind === 'promotion') d.promotedAt = state.youth.length;
      else if (pending.kind === 'training') d.training = { ...d.training, [String(pending.season)]: 'tecnica' };
      else if (pending.kind === 'dilemma') {
        d.dilemmas = { ...d.dilemmas, [decisionKey(pending.season, pending.dilemma.id)]: pending.dilemma.options[0]!.id };
      } else d.transfers = { ...d.transfers, [String(pending.season)]: 'resta' };
      save = { ...save, decisions: d };
      state = playCareer(save, clubs);
    }
    return state;
  }

  it('il primo anno di vivaio chiede un episodio', () => {
    const stato = playCareer(base, clubs);
    expect(stato.pending?.kind).toBe('youth-event');
    if (stato.pending?.kind !== 'youth-event') throw new Error('atteso un episodio');
    expect(stato.pending.year).toBe(1);
    expect(stato.pending.dilemma.options.length).toBeGreaterThanOrEqual(2);
    // L'anno non è ancora chiuso: il resoconto arriva dopo la risposta.
    expect(stato.youth).toHaveLength(0);
  });

  it('rispondere chiude l’anno, e la risposta cambia l’overall d’uscita', () => {
    const stato = playCareer(base, clubs);
    if (stato.pending?.kind !== 'youth-event') throw new Error('atteso un episodio');
    const [prima, seconda] = stato.pending.dilemma.options;

    const con = (optionId: string): ReturnType<typeof playCareer> =>
      playCareer(
        { ...base, decisions: { ...base.decisions, youthEvents: { '1': optionId } } },
        clubs,
      );

    const a = con(prima!.id);
    const b = con(seconda!.id);
    expect(a.youth).toHaveLength(1);
    expect(a.episodes).toHaveLength(1);
    expect(a.episodes[0]!.optionId).toBe(prima!.id);
    // Stesso anno, stesso allenamento: cambia solo la risposta all'episodio.
    expect(a.youth[0]!.overallStart).toBe(b.youth[0]!.overallStart);
    expect(a.youth[0]!.overallEnd).not.toBe(b.youth[0]!.overallEnd);
  });

  it('l’episodio è deterministico: lo stesso salvataggio dà lo stesso episodio', () => {
    const uno = playCareer(base, clubs);
    const due = playCareer({ ...base }, clubs);
    if (uno.pending?.kind !== 'youth-event' || due.pending?.kind !== 'youth-event') {
      throw new Error('atteso un episodio');
    }
    expect(uno.pending.dilemma.id).toBe(due.pending.dilemma.id);
  });

  it('il segno lasciato nel vivaio arriva nella prima stagione', () => {
    /*
     * Si cercano fra i seed le carriere il cui primo episodio ha una risposta che
     * lascia un segno certo, e si verifica che quel segno sia addosso al giocatore
     * alla prima stagione da professionista. Se nessun seed la trova, il test
     * fallisce: un controllo che non incontra mai il caso non controlla niente.
     */
    let provate = 0;
    for (let seed = 1; seed <= 40; seed += 1) {
      const partenza: CareerSave = { ...base, seed };
      const stato = playCareer(partenza, clubs);
      if (stato.pending?.kind !== 'youth-event') continue;
      const conSegno = stato.pending.dilemma.options.find((option) =>
        option.outcomes.every((outcome) => outcome.effects.addMark !== undefined),
      );
      if (!conSegno) continue;

      provate += 1;
      const dopo = avanza(
        {
          ...partenza,
          decisions: {
            ...partenza.decisions,
            youthEvents: { '1': conSegno.id },
            promotedAt: 1,
          },
        },
        (state) => state.seasons.length >= 1,
      );
      const segno = dopo.episodes[0]?.mark;
      expect(segno).toBeTruthy();
      expect(dopo.seasons[0]).toBeDefined();

      /*
       * O il segno è ancora addosso a fine stagione, o quella stagione contiene il
       * bivio che lo ha tolto — «lavoro mentale» esiste solo per chi ha la testa
       * fragile. Le due cose dicono la stessa cosa: il vivaio è arrivato in prima
       * squadra. Pretendere solo la prima farebbe fallire il test proprio quando il
       * gioco funziona meglio.
       */
      const prima = dopo.seasons[0]!;
      const ancora = prima.marks.some((mark) => mark.id === segno!.id);
      // «lavoro mentale» si presenta solo a chi ha la testa fragile: se compare, il
      // segno del vivaio era addosso al giocatore quando la stagione è cominciata.
      const lavorato = prima.choices.some((choice) => choice.dilemmaId === 'lavoro-mentale');
      expect(ancora || lavorato).toBe(true);
    }
    expect(provate).toBeGreaterThan(0);
  });

  it('una carriera già uscita dal vivaio non si ferma a chiedere episodi di allora', () => {
    // È il caso dei salvataggi nati prima degli episodi: devono continuare a caricarsi.
    const vecchio: CareerSave = {
      ...base,
      decisions: { ...base.decisions, promotedAt: 2, youthEvents: undefined },
    };
    const stato = playCareer(vecchio, clubs);
    expect(stato.pending?.kind).not.toBe('youth-event');
    expect(stato.youth).toHaveLength(2);
    expect(stato.episodes).toHaveLength(0);
  });
});
