'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, type ReactElement } from 'react';
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
import { AMBIZIONI, type AmbizioneId } from '../engine/ambizione';
import { MODI_PARTITA, type ModoPartita } from './preferenze';
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
  const [modo, setModo] = useState<ModoPartita>('dettagliata');
  const [ambizione, setAmbizione] = useState<AmbizioneId>('nessuna');
  const [leagueId, setLeagueId] = useState('');

  // Ogni passo comincia dall'alto: restare a metà strada fa perdere il filo. Adesso
  // a scorrere è il corpo della scena, non la finestra.
  useEffect(() => {
    document.querySelector('.scena-corpo')?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [passo]);

  const ruolo = posizioneById(posizione);
  const campionati = world.leagues
    .filter((league) => league.country === country)
    .sort((a, b) => a.level - b.level);
  const lega = world.leagues.find((league) => league.id === leagueId);
  const club = world.clubs
    .filter((entry) => entry.leagueId === leagueId)
    .sort((a, b) => clubStrength(b.club) - clubStrength(a.club));

  // Le due categorie più basse del paese, un girone per livello: è da lì che
  // arrivano le proposte di vivaio.
  const livelliBassi = [...new Set(campionati.map((league) => league.level))]
    .sort((a, b) => b - a)
    .slice(0, 2);
  const legheVivaio = livelliBassi
    .map((livello) => campionati.find((league) => league.level === livello))
    .filter((league): league is (typeof campionati)[number] => league !== undefined);

  /**
   * Tre proposte diverse fra loro: la squadra più modesta del fondo, una di metà
   * classifica e la più forte della categoria sopra. Se sono tutte uguali non è
   * una scelta, è un modulo da compilare.
   */
  function offerteDiVivaio(): typeof world.clubs {
    const scelte: typeof world.clubs = [];
    const bassa = legheVivaio[0];
    const alta = legheVivaio[1];

    const daLega = (id: string | undefined) =>
      id === undefined
        ? []
        : world.clubs
            .filter((entry) => entry.leagueId === id)
            .sort((a, b) => clubStrength(a.club) - clubStrength(b.club));

    const inBasso = daLega(bassa?.id);
    const inAlto = daLega(alta?.id);
    if (inBasso[0]) scelte.push(inBasso[0]);
    const mediana = inBasso[Math.floor(inBasso.length / 2)];
    if (mediana) scelte.push(mediana);
    const migliore = inAlto[inAlto.length - 1];
    if (migliore) scelte.push(migliore);

    // Se il paese ha una piramide corta si ripiega sui club più deboli disponibili.
    if (scelte.length < 3) {
      for (const entry of [...inBasso, ...inAlto]) {
        if (scelte.length >= 3) break;
        if (!scelte.includes(entry)) scelte.push(entry);
      }
    }
    return scelte;
  }

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
        modo,
        ambizione,
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
          {/*
            Scelto un paese, la sua scheda prende il posto della mappa invece di
            nascere sotto: una cosa per volta, senza andarla a cercare.
          */}
          {country === '' ? (
            <>
              {testata('Da dove vieni', 'Tre passi: nazione, ruolo e maglia, poi le opzioni di carriera.', 1)}
              <Mappa giocabili={world.countries} scelto={country} onChoose={setCountry} />
            </>
          ) : (
            <>
              {testata('Da dove vieni', 'Ecco dove si gioca. Se non ti convince, cambia pure.', 1)}
              <Nazione country={country} leagues={world.leagues} onConfirm={() => setPasso(2)} />
              <button
                type="button"
                className="bottone"
                style={{ marginTop: '.6rem', textAlign: 'center' }}
                onClick={() => setCountry('')}
              >
                ← Scegli un&apos;altra nazione
              </button>
            </>
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


          <button type="button" className="avanti" onClick={() => setPasso(3)}>
            <span>Avanti</span>
            <span aria-hidden="true">→</span>
          </button>
        </>
      )}

      {passo === 3 && (
        <>
          {testata('Opzioni carriera', 'Come vuoi cominciare, e come vuoi vivere le stagioni.', 3)}

          <span className="contesto-etichetta" style={{ display: 'block', marginBottom: '.35rem' }}>
            Che giocatore sei
          </span>
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

          <span className="contesto-etichetta" style={{ display: 'block', marginBottom: '.35rem' }}>
            Come vivi le stagioni
          </span>
          <div className="stili" style={{ marginBottom: '.9rem' }}>
            {MODI_PARTITA.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`stile${modo === item.id ? ' stile-scelto' : ''}`}
                onClick={() => setModo(item.id)}
              >
                <span>
                  <span className="posta">{item.occhiello}</span>
                  <strong style={{ display: 'block' }}>{item.label}</strong>
                  <span className="tenue" style={{ display: 'block', fontSize: '.82rem' }}>{item.text}</span>
                </span>
                <span className="stile-spunta" aria-hidden="true">{modo === item.id ? '✓' : ''}</span>
              </button>
            ))}
          </div>

          <span className="contesto-etichetta" style={{ display: 'block', marginBottom: '.35rem' }}>
            Che carriera vuoi che sia
          </span>
          <div className="stili" style={{ marginBottom: '.9rem' }}>
            {AMBIZIONI.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`stile${ambizione === item.id ? ' stile-scelto' : ''}`}
                onClick={() => setAmbizione(item.id)}
              >
                <span>
                  <strong>{item.titolo}</strong>
                  <span className="tenue" style={{ display: 'block', fontSize: '.82rem' }}>{item.testo}</span>
                </span>
                <span className="stile-spunta" aria-hidden="true">
                  {ambizione === item.id ? '✓' : item.premio > 0 ? `+${item.premio}` : ''}
                </span>
              </button>
            ))}
          </div>

          <span className="contesto-etichetta" style={{ display: 'block', marginBottom: '.35rem' }}>
            Da dove cominci
          </span>
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
              // A sorpresa: le proposte arrivano dalle due categorie più basse.
              if (primaLega) {
                setLeagueId(primaLega.id);
                void world
                  .loadLeagues(legheVivaio.map((league) => league.id))
                  .then(() => setPasso(4));
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

          {(() => {
            const proposte = sceltaClub === 'sorpresa' ? offerteDiVivaio() : club;
            return proposte.length === 0 ? <p className="tenue">Sto caricando le squadre…</p> : null;
          })()}

          <Scelte>
            {(sceltaClub === 'sorpresa' ? offerteDiVivaio() : club).map((entry) => {
              const forza = clubStrength(entry.club);
              const suaLega = world.leagues.find((league) => league.id === entry.leagueId);
              return (
                <Scelta
                  key={entry.club.id}
                  sigla={sigla(entry.club.name)}
                  titolo={sceltaClub === 'sorpresa' ? `Firma per ${entry.club.name}` : entry.club.name}
                  sottotitolo={inItaliano(country).toUpperCase()}
                  nota={`${(sceltaClub === 'sorpresa' ? suaLega?.name : lega?.name) ?? ''} · ${entry.club.squad.length} in rosa`}
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
                  onClick={() =>
                    avvia(
                      entry.club.id,
                      (sceltaClub === 'sorpresa' ? suaLega?.level : lega?.level) ?? 1,
                      country,
                    )
                  }
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
