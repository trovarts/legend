'use client';

import dynamic from 'next/dynamic';
import { useState, type ReactElement } from 'react';
import { clubStrength } from '../engine/clubStrength';
import type { CareerSave } from '../engine/play';
import { PLAY_STYLES, type PlayStyle } from '../engine/playstyle';
import { ASPETTO_INIZIALE, Avatar, NOMI_CAPELLI, NOMI_DIVISA, NOMI_ESPRESSIONE, NOMI_PELLE, NOMI_SCARPINI, type Aspetto } from './Avatar';
import { Campo, posizioneById } from './Campo';
import { inItaliano } from './bandiere';
// La mappa del mondo pesa più di tutto il resto: si scarica solo quando serve
// davvero, cioè al primo passo di una carriera nuova (D-017).
const Mappa = dynamic(() => import('./Mappa').then((modulo) => modulo.Mappa), {
  ssr: false,
  loading: () => <p className="tenue">Sto aprendo il planisfero…</p>,
});
import { Nazione } from './Nazione';
import { newSave, randomSeed } from './newSave';
import { Scelta, Scelte, sigla } from './Scelte';
import type { useWorld } from './useWorld';

type Passo = 1 | 2 | 3 | 4;

const OPZIONI_ASPETTO = [
  { chiave: 'pelle' as const, nome: 'Pelle', valori: NOMI_PELLE },
  { chiave: 'capelli' as const, nome: 'Capelli', valori: NOMI_CAPELLI },
  { chiave: 'espressione' as const, nome: 'Espressione', valori: NOMI_ESPRESSIONE },
  { chiave: 'divisa' as const, nome: 'Divisa', valori: NOMI_DIVISA },
  { chiave: 'scarpini' as const, nome: 'Scarpini', valori: NOMI_SCARPINI },
];

export function Creazione({
  world,
  onStart,
}: {
  world: ReturnType<typeof useWorld>;
  onStart: (save: CareerSave) => void;
}) {
  const [passo, setPasso] = useState<Passo>(1);
  const [country, setCountry] = useState('');
  const [posizione, setPosizione] = useState('ST');
  const [style, setStyle] = useState<PlayStyle>('equilibrato');
  const [aspetto, setAspetto] = useState<Aspetto>(ASPETTO_INIZIALE);
  const [name, setName] = useState('');
  const [numero, setNumero] = useState('10');
  const [piede, setPiede] = useState<'Destro' | 'Sinistro'>('Destro');
  const [sceltaClub, setSceltaClub] = useState<'sorpresa' | 'io'>('sorpresa');
  const [leagueId, setLeagueId] = useState('');

  const ruolo = posizioneById(posizione);
  const campionati = world.leagues
    .filter((league) => league.country === country)
    .sort((a, b) => a.level - b.level);
  const lega = world.leagues.find((league) => league.id === leagueId);
  const club = world.clubs
    .filter((entry) => entry.leagueId === leagueId)
    .sort((a, b) => clubStrength(b.club) - clubStrength(a.club));

  const testata = (titolo: string, sommario: string, numeroPasso: Passo): ReactElement => (
    <>
      <header className="testata">
        <span className="testata-nome">DEFINISCI LA TUA IDENTITÀ</span>
        <span className="testata-data">
          {[1, 2, 3].map((n) => (
            <span key={n} className={`passo${numeroPasso === n ? ' passo-attivo' : ''}`}>{n}</span>
          ))}
        </span>
      </header>
      <h2 className="titolone">{titolo}</h2>
      <p className="sommario">{sommario}</p>
    </>
  );

  function avvia(startClubId: string, leagueLevel: number, paese: string): void {
    const base = newSave({
      name: name.trim() === '' ? 'Il tuo giocatore' : name,
      nationality: paese,
      role: ruolo.role,
      age: 14,
      leagueLevel,
      startClubId,
      seed: randomSeed(),
    });
    onStart({
      ...base,
      decisions: {
        ...base.decisions,
        style,
        position: posizione,
        look: aspetto,
        numero,
        piede,
      },
    });
  }

  return (
    <section className="giornale">
      {passo === 1 && (
        <>
          {testata('Da dove vieni', 'Tre passi: nazione, ruolo e maglia, poi le opzioni di carriera.', 1)}
          <Mappa giocabili={world.countries} scelto={country} onChoose={setCountry} />
          {country !== '' && (
            <Nazione country={country} leagues={world.leagues} onConfirm={() => setPasso(2)} />
          )}
        </>
      )}

      {passo === 2 && (
        <>
          {testata('Ruolo e maglia', `${inItaliano(country)}. Dove giochi, e che giocatore vuoi essere.`, 2)}
          <div className="identita">
            <div>
              <span className="contesto-etichetta">Ruolo</span>
              <Campo scelta={posizione} onChoose={setPosizione} />
              <div className="card" style={{ marginTop: '.6rem', marginBottom: 0 }}>
                <strong>{ruolo.label}</strong>
                <p className="tenue" style={{ margin: '.2rem 0 0', fontSize: '.85rem' }}>{ruolo.text}</p>
              </div>
            </div>

            <div>
              <span className="contesto-etichetta">
                Aspetto
                <button
                  type="button"
                  className="a-caso"
                  onClick={() =>
                    setAspetto({
                      pelle: Math.floor(Math.random() * NOMI_PELLE.length),
                      capelli: Math.floor(Math.random() * NOMI_CAPELLI.length),
                      espressione: Math.floor(Math.random() * NOMI_ESPRESSIONE.length),
                      divisa: Math.floor(Math.random() * NOMI_DIVISA.length),
                      scarpini: Math.floor(Math.random() * NOMI_SCARPINI.length),
                    })
                  }
                >
                  <span aria-hidden="true">⤨</span> A caso
                </button>
              </span>
              <div className="card" style={{ marginTop: '.35rem' }}>
                <Avatar aspetto={aspetto} numero={numero} />
                {OPZIONI_ASPETTO.map((opzione) => (
                  <div key={opzione.chiave} className="aspetto-riga">
                    <span className="contesto-etichetta">{opzione.nome}</span>
                    <button
                      type="button"
                      className="aspetto-freccia"
                      aria-label={`${opzione.nome} precedente`}
                      onClick={() =>
                        setAspetto((corrente) => ({
                          ...corrente,
                          [opzione.chiave]: (corrente[opzione.chiave] + opzione.valori.length - 1) % opzione.valori.length,
                        }))
                      }
                    >
                      ‹
                    </button>
                    <span className="aspetto-valore">{opzione.valori[aspetto[opzione.chiave] % opzione.valori.length]}</span>
                    <button
                      type="button"
                      className="aspetto-freccia"
                      aria-label={`${opzione.nome} successivo`}
                      onClick={() =>
                        setAspetto((corrente) => ({
                          ...corrente,
                          [opzione.chiave]: (corrente[opzione.chiave] + 1) % opzione.valori.length,
                        }))
                      }
                    >
                      ›
                    </button>
                  </div>
                ))}
              </div>

              <div className="card" style={{ marginBottom: 0 }}>
                <label htmlFor="nome" className="contesto-etichetta">Nome</label>
                <input
                  id="nome"
                  className="bottone"
                  style={{ marginTop: '.3rem' }}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Il tuo giocatore"
                />
                <div className="riga" style={{ marginTop: '.5rem' }}>
                  <span style={{ flex: 1 }}>
                    <label htmlFor="numero" className="contesto-etichetta">Numero</label>
                    <input
                      id="numero"
                      className="bottone"
                      style={{ marginTop: '.3rem' }}
                      inputMode="numeric"
                      value={numero}
                      onChange={(event) => setNumero(event.target.value.replace(/\D/g, '').slice(0, 2))}
                    />
                  </span>
                  <span style={{ flex: 1 }}>
                    <span className="contesto-etichetta">Piede preferito</span>
                    <div className="riga" style={{ gap: '.4rem', marginTop: '.3rem' }}>
                      {(['Sinistro', 'Destro'] as const).map((valore) => (
                        <button
                          key={valore}
                          type="button"
                          className={`bottone${piede === valore ? ' bottone-scelto' : ''}`}
                          style={{ textAlign: 'center' }}
                          onClick={() => setPiede(valore)}
                        >
                          {valore}
                        </button>
                      ))}
                    </div>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <span className="contesto-etichetta" style={{ display: 'block', marginTop: '.8rem' }}>Gioco</span>
          <div className="stili">
            {PLAY_STYLES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`stile${style === item.id ? ' stile-scelto' : ''}`}
                onClick={() => setStyle(item.id)}
              >
                <span>
                  <strong>{item.label}</strong>
                  <span className="tenue" style={{ display: 'block', fontSize: '.82rem' }}>{item.text}</span>
                </span>
                <span className="stile-spunta" aria-hidden="true">{style === item.id ? '✓' : ''}</span>
              </button>
            ))}
          </div>

          <button type="button" className="avanti" onClick={() => setPasso(3)}>
            <span>Avanti</span>
            <span aria-hidden="true">→</span>
          </button>
        </>
      )}

      {passo === 3 && (
        <>
          {testata('Opzioni carriera', 'Come vuoi cominciare: con una sorpresa o scegliendo tu.', 3)}
          <div className="stili">
            <button
              type="button"
              className={`stile${sceltaClub === 'sorpresa' ? ' stile-scelto' : ''}`}
              onClick={() => setSceltaClub('sorpresa')}
            >
              <span>
                <strong>Offerte a sorpresa</strong>
                <span className="tenue" style={{ display: 'block', fontSize: '.82rem' }}>
                  Tre club del tuo paese ti offrono un posto nel vivaio: scegli fra quelli.
                </span>
              </span>
              <span className="stile-spunta" aria-hidden="true">{sceltaClub === 'sorpresa' ? '✓' : ''}</span>
            </button>
            <button
              type="button"
              className={`stile${sceltaClub === 'io' ? ' stile-scelto' : ''}`}
              onClick={() => setSceltaClub('io')}
            >
              <span>
                <strong>Scegli tu</strong>
                <span className="tenue" style={{ display: 'block', fontSize: '.82rem' }}>
                  Categoria e club: parti esattamente dove vuoi.
                </span>
              </span>
              <span className="stile-spunta" aria-hidden="true">{sceltaClub === 'io' ? '✓' : ''}</span>
            </button>
          </div>

          <button
            type="button"
            className="avanti"
            onClick={() => {
              const primaLega = campionati[campionati.length - 1] ?? campionati[0];
              if (sceltaClub === 'io') {
                setPasso(4);
                if (primaLega) {
                  setLeagueId(primaLega.id);
                  void world.loadLeagues([primaLega.id]);
                }
                return;
              }
              // A sorpresa: si parte dal fondo della piramide del proprio paese.
              if (primaLega) {
                setLeagueId(primaLega.id);
                void world.loadLeagues([primaLega.id]).then(() => setPasso(4));
              }
            }}
          >
            <span>Conferma identità</span>
            <span aria-hidden="true">→</span>
          </button>
        </>
      )}

      {passo === 4 && (
        <>
          {testata(
            sceltaClub === 'sorpresa' ? 'Primo contratto' : 'Scegli il club',
            sceltaClub === 'sorpresa'
              ? `Tre club in ${inItaliano(country)} ti offrono un posto nel settore giovanile. A quattordici anni, si comincia da qui.`
              : 'Categoria e squadra: più in basso parti, più vale alla fine.',
            3,
          )}

          {sceltaClub === 'io' && campionati.length > 1 && (
            <div className="riga" style={{ marginBottom: '.7rem' }}>
              {campionati.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`bottone${leagueId === item.id ? ' bottone-scelto' : ''}`}
                  style={{ textAlign: 'center' }}
                  onClick={() => {
                    setLeagueId(item.id);
                    void world.loadLeagues([item.id]);
                  }}
                >
                  {item.name}
                  <span className="posta">{item.level}ª divisione</span>
                </button>
              ))}
            </div>
          )}

          {club.length === 0 && <p className="tenue">Sto caricando le squadre…</p>}

          <Scelte>
            {(sceltaClub === 'sorpresa' ? club.slice(-3) : club).map((entry) => {
              const forza = clubStrength(entry.club);
              return (
                <Scelta
                  key={entry.club.id}
                  sigla={sigla(entry.club.name)}
                  titolo={sceltaClub === 'sorpresa' ? `Firma per ${entry.club.name}` : entry.club.name}
                  sottotitolo={inItaliano(country).toUpperCase()}
                  nota={`${lega?.name ?? ''} · ${entry.club.squad.length} in rosa`}
                  etichetta="forza della rosa"
                  sicura={forza < 72}
                  puntata={
                    <span className="puntata">
                      <span className={`faccia faccia-${forza >= 76 ? 'male' : 'bene'}`}>
                        <b className="faccia-quota">overall</b>
                        <span className="faccia-esito">{forza.toFixed(0)}</span>
                      </span>
                      <span className="faccia faccia-bene">
                        <span className="faccia-esito">inizio nel vivaio</span>
                      </span>
                    </span>
                  }
                  onClick={() => avvia(entry.club.id, lega?.level ?? 1, country)}
                />
              );
            })}
          </Scelte>
        </>
      )}

      {passo > 1 && (
        <button
          type="button"
          className="bottone"
          style={{ marginTop: '1rem', textAlign: 'center' }}
          onClick={() => setPasso((corrente) => (corrente - 1) as Passo)}
        >
          ← Torna indietro
        </button>
      )}
    </section>
  );
}
