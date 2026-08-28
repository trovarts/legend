'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { clubStrength } from '../engine/clubStrength';
import type { CandidateClub } from '../engine/market';
import { decisionKey, playCareer, type CareerSave } from '../engine/play';
import { Agente } from './Agente';
import { AnnoVivaio } from './AnnoVivaio';
import { Bivio } from './Bivio';
import { Contesto } from './Contesto';
import { FineStagione } from './FineStagione';
import { Gerarchia } from './Gerarchia';
import { Giornale } from './Giornale';
import { Mercato } from './Mercato';
import { modoDi } from './preferenze';
import { Preparazione } from './Preparazione';
import { Tessera } from './Tessera';
import { Promozione, Vivaio } from './Vivaio';
import { Bacheca, BarraSchede, Profilo, SchedaAgente, Statistiche, type Scheda } from './Schede';
import { Esito, facceDaEffetti, type FacciaEsito } from './Esito';
import { youthOption, type YouthApproach } from '../engine/youth';
import type { Dilemma } from '../engine/types';
import { posizioneById } from './Campo';
import { PLAY_STYLES } from '../engine/playstyle';
import { temaDelClub } from './temaClub';
import { AGENTS } from '../engine/agent';
import { Verdetto } from './Verdetto';

export function Carriera({
  save,
  clubs,
  onChange,
}: {
  save: CareerSave;
  clubs: readonly CandidateClub[];
  onChange: (save: CareerSave) => void;
}) {
  // Nessuno stato di gioco qui dentro: la schermata è una funzione del salvataggio.
  const state = useMemo(() => playCareer(save, clubs), [save, clubs]);
  const seasons = state.seasons;
  const last = seasons[seasons.length - 1];
  const lastRival = state.rivals[state.rivals.length - 1] ?? null;

  /**
   * Fin dove l'utente ha già guardato: serve solo alla messa in scena, non al gioco.
   * Riprendendo una carriera si riparte da dov'era: le stagioni già vissute non si
   * rivedono una per una, e gli anni di vivaio nemmeno.
   */
  const [vista, setVista] = useState(() => Math.max(0, state.seasons.length - 1));
  const [vivaioVisto, setVivaioVisto] = useState(() =>
    state.seasons.length > 0 ? state.youth.length : 0,
  );
  const [scheda, setScheda] = useState<Scheda>('carriera');
  /**
   * Una scommessa appena giocata di cui va ancora mostrato l'esito.
   * Non è stato di gioco: la carriera è già decisa: è solo il momento in cui
   * si guarda quale faccia è uscita.
   */
  const [attesa, setAttesa] = useState<
    | { tipo: 'dilemma'; season: number; dilemma: Dilemma; optionId: string }
    | { tipo: 'vivaio'; year: number; approach: YouthApproach }
    | null
  >(null);

  // Barra spaziatrice: manda avanti, come in un gioco vero.
  useEffect(() => {
    const premuto = (evento: KeyboardEvent): void => {
      if (evento.code !== 'Space' && evento.key !== ' ') return;
      const attivo = document.activeElement;
      if (attivo instanceof HTMLInputElement || attivo instanceof HTMLTextAreaElement) return;
      const avanti = document.querySelector<HTMLButtonElement>('button.avanti');
      if (avanti) {
        evento.preventDefault();
        avanti.click();
      }
    };
    window.addEventListener('keydown', premuto);
    return () => window.removeEventListener('keydown', premuto);
  }, []);
  const daMostrare = last !== undefined && last.season > vista ? last : null;
  const annoVivaio = state.youth.find((anno) => anno.year > vivaioVisto) ?? null;

  /** Ricava dai dati già calcolati quale faccia è uscita, per poterla mostrare. */
  const rivelazione = (():
    | { titolo: string; scelta: string; facce: FacciaEsito[]; uscita: number; racconto: string }
    | null => {
    if (attesa === null) return null;

    if (attesa.tipo === 'vivaio') {
      const anno = state.youth.find((item) => item.year === attesa.year);
      if (!anno) return null;
      const option = youthOption(attesa.approach);
      const facce: FacciaEsito[] = option.outcomes.map((outcome) => ({
        chance: outcome.chance,
        testo: outcome.label,
        dettaglio: '',
        buona: outcome.overall > 0,
      }));
      const uscita = Math.max(0, option.outcomes.findIndex((outcome) => outcome.label === anno.outcomeLabel));
      const salita = anno.overallEnd - anno.overallStart;
      return {
        titolo: `${anno.age} anni · vivaio`,
        scelta: option.title,
        facce,
        uscita,
        racconto:
          salita > 0
            ? `Un anno di lavoro ben speso: da ${anno.overallStart} a ${anno.overallEnd}.`
            : 'Il fisico non ha risposto: nessun passo avanti, quest’anno.',
      };
    }

    const stagione = seasons.find((item) => item.season === attesa.season);
    const scelta = stagione?.choices.find((item) => item.dilemmaId === attesa.dilemma.id);
    if (!stagione || !scelta) return null;
    const option = attesa.dilemma.options.find((item) => item.id === attesa.optionId);
    if (!option) return null;
    const uscita = Math.max(0, option.outcomes.findIndex((outcome) => outcome.text === scelta.outcomeText));
    return {
      titolo: `${stagione.age} anni · ${stagione.clubName}`,
      scelta: option.label,
      facce: facceDaEffetti(option.outcomes),
      uscita,
      racconto: scelta.outcomeText,
    };
  })();

  const decide = (patch: Partial<CareerSave['decisions']>): void => {
    onChange({ ...save, decisions: { ...save.decisions, ...patch } });
  };

  const pending = state.pending;
  const clubCorrente = clubs.find((entry) => entry.club.id === last?.clubId);

  /**
   * I colori del club tingono tutta l'interfaccia: giocare nel Monza non deve
   * assomigliare a giocare nell'Inter. Le variabili sono le stesse di sempre,
   * cambia solo il loro valore.
   */
  const nomeClub = last?.clubName ?? state.youth[state.youth.length - 1]?.clubName
    ?? (pending?.kind === 'youth' || pending?.kind === 'promotion' ? pending.clubName : undefined);
  const tema = nomeClub !== undefined ? temaDelClub(nomeClub) : null;

  return (
    <div
      className="tinta"
      style={
        tema === null
          ? undefined
          : ({
              '--rosso': tema.primario,
              '--rosso-scuro': tema.secondario,
            } as CSSProperties)
      }
    >
      <Tessera
        name={save.create.name}
        nationality={save.create.nationality}
        goat={state.result?.goat.total ?? 0}
        look={save.decisions.look}
        numero={save.decisions.numero}
        last={last}
        rival={lastRival}
        ora={
          pending?.kind === 'training'
            ? { age: pending.age, overall: pending.overall, clubName: pending.clubName }
            : pending?.kind === 'dilemma'
              ? { clubName: pending.soFar.clubName }
              : pending?.kind === 'youth' || pending?.kind === 'promotion'
                ? { age: pending.age, overall: pending.overall, clubName: pending.clubName }
                : annoVivaio !== null
                  ? { age: annoVivaio.age, overall: annoVivaio.overallEnd, clubName: annoVivaio.clubName }
                  : undefined
        }
      />

      {state.agent !== null && <BarraSchede attiva={scheda} onChange={setScheda} />}

      {scheda === 'profilo' && (
        <Profilo
          name={save.create.name}
          position={posizioneById(save.decisions.position ?? 'ST').label}
          style={PLAY_STYLES.find((item) => item.id === (save.decisions.style ?? 'equilibrato'))?.label ?? '—'}
          seasons={seasons}
          youth={state.youth}
        />
      )}

      {scheda === 'agente' && (
        <SchedaAgente
          agent={state.agent}
          offerte={seasons.reduce((somma, stagione) => somma + stagione.offers.length, 0)}
          prossimaStagione={seasons.length + 1}
          richiesta={save.decisions.requests?.[String(seasons.length + 1)]}
          onRichiesta={(kind) =>
            onChange({
              ...save,
              decisions: {
                ...save.decisions,
                requests: { ...save.decisions.requests, [String(seasons.length + 1)]: kind },
              },
            })
          }
          proposte={
            // Dopo qualche stagione da titolare, gli agenti migliori si fanno vivi.
            seasons.length >= 4 && (last?.minutesShare ?? 0) > 0.5
              ? AGENTS.filter(
                  (altro) => altro.id !== state.agent?.id && altro.stars > (state.agent?.stars ?? 0),
                )
              : []
          }
          onCambia={(agentId) => onChange({ ...save, decisions: { ...save.decisions, agentId } })}
        />
      )}

      {scheda === 'statistiche' && <Statistiche seasons={seasons} />}
      {scheda === 'bacheca' && <Bacheca result={state.result} seasons={seasons} />}

      {scheda === 'carriera' && rivelazione !== null && (
        <Esito
          titolo={rivelazione.titolo}
          scelta={rivelazione.scelta}
          facce={rivelazione.facce}
          uscita={rivelazione.uscita}
          racconto={rivelazione.racconto}
          onEnd={() => setAttesa(null)}
        />
      )}

      {scheda === 'carriera' && rivelazione === null && pending?.kind === 'agent' && (
        <Agente
          options={pending.options}
          onChoose={(agentId) => onChange({ ...save, decisions: { ...save.decisions, agentId } })}
        />
      )}

      {scheda === 'carriera' && rivelazione === null && annoVivaio !== null && pending?.kind !== 'agent' && (
        <AnnoVivaio key={annoVivaio.year} season={annoVivaio} onEnd={() => setVivaioVisto(annoVivaio.year)} />
      )}

      {scheda === 'carriera' && rivelazione === null && annoVivaio === null && pending?.kind === 'youth' && (
        <Vivaio
          year={pending.year}
          age={pending.age}
          clubName={pending.clubName}
          onChoose={(approach) => {
            setAttesa({ tipo: 'vivaio', year: pending.year, approach });
            onChange({
              ...save,
              decisions: {
                ...save.decisions,
                youth: { ...save.decisions.youth, [String(pending.year)]: approach },
              },
            });
          }}
        />
      )}

      {scheda === 'carriera' && rivelazione === null && annoVivaio === null && pending?.kind === 'promotion' && (
        <Promozione
          age={pending.age}
          clubName={pending.clubName}
          overall={pending.overall}
          onChoose={(sali) =>
            onChange({
              ...save,
              decisions: {
                ...save.decisions,
                promotedAt: sali ? state.youth.length : state.youth.length + 1,
              },
            })
          }
        />
      )}

      {scheda === 'carriera' && rivelazione === null && annoVivaio === null && (daMostrare !== null ? (
        <FineStagione
          key={daMostrare.season}
          record={daMostrare}
          previous={seasons[seasons.length - 2]}
          rival={lastRival}
          clubs={clubs}
          playerName={save.create.name}
          nazione={save.create.nationality}
          seed={save.seed}
          modo={modoDi(save.decisions.modo)}
          onEnd={() => setVista(daMostrare.season)}
        />
      ) : (
        <>
          <Contesto
            last={last}
            clubStrengthValue={clubCorrente ? clubStrength(clubCorrente.club) : null}
            contractYearsLeft={null}
          />

          {/* Chi ti sta davanti nel reparto: è quello che decide quanto giochi. */}
          {clubCorrente && (last !== undefined || pending?.kind === 'training') && (
            <Gerarchia
              playerName={save.create.name}
              overall={last?.overallEnd ?? (pending?.kind === 'training' ? pending.overall : 0)}
              age={last?.age ?? (pending?.kind === 'training' ? pending.age : 0)}
              role={save.create.role}
              squad={clubCorrente.club.squad}
              clubName={clubCorrente.club.name}
            />
          )}

          {pending?.kind === 'training' && (
            <Preparazione
              season={pending.season}
              age={pending.age}
              clubName={pending.clubName}
              objectives={pending.objectives}
              onChoose={(axis) =>
                decide({ training: { ...save.decisions.training, [String(pending.season)]: axis } })
              }
            />
          )}

          {pending?.kind === 'dilemma' && (
            <Bivio
              dilemma={pending.dilemma}
              soFar={pending.soFar}
              onChoose={(optionId) => {
                setAttesa({
                  tipo: 'dilemma',
                  season: pending.season,
                  dilemma: pending.dilemma,
                  optionId,
                });
                decide({
                  dilemmas: {
                    ...save.decisions.dilemmas,
                    [decisionKey(pending.season, pending.dilemma.id)]: optionId,
                  },
                });
              }}
            />
          )}

          {pending?.kind === 'transfer' && (
            <Mercato
              offers={pending.offers}
              clubName={last?.clubName ?? 'la tua squadra'}
              onChoose={(clubId) =>
                decide({ transfers: { ...save.decisions.transfers, [String(pending.season)]: clubId } })
              }
            />
          )}

          {state.finished && state.result !== null && <Verdetto result={state.result} />}

          {last && state.finished && (
            <Giornale
              record={last}
              previous={seasons[seasons.length - 2]}
              isFirst={last.season === 1}
              playerName={save.create.name}
              rival={lastRival}
            />
          )}
        </>
      ))}

      {scheda === 'carriera' && seasons.length > 1 && daMostrare === null && (
        <details className="card archivio">
          <summary>Archivio · le {seasons.length} stagioni giocate</summary>
          {[...seasons].reverse().map((record) => (
            <div key={record.season} className="archivio-riga">
              <span>
                <strong>{record.age} anni</strong> <span className="tenue">{record.clubName}</span>
              </span>
              <span className="numero tenue">
                {record.stats.appearances}p · {record.stats.goals}g · OVR {record.overallEnd}
                {record.trophies.length > 0 && ` · ${record.trophies.length}🏆`}
              </span>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}
