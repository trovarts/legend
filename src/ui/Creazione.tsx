'use client';

import { useState, type ReactElement } from 'react';
import { clubStrength } from '../engine/clubStrength';
import type { CareerSave } from '../engine/play';
import type { Role } from '../world/types';
import { bandiera, inItaliano } from './bandiere';
import { newSave, randomSeed } from './newSave';
import { Scelta, Scelte, sigla } from './Scelte';
import type { useWorld } from './useWorld';

const RUOLI: readonly { id: Role; label: string; nota: string; promessa: string }[] = [
  { id: 'GK', label: 'Portiere', nota: 'Un posto solo, e te lo devi prendere', promessa: 'parate e porta inviolata' },
  { id: 'DEF', label: 'Difensore', nota: 'Ti giudicano su quello che non succede', promessa: 'clean sheet e continuità' },
  { id: 'MID', label: 'Centrocampista', nota: 'Il gioco passa da te, nel bene e nel male', promessa: 'assist e regia' },
  { id: 'FWD', label: 'Attaccante', nota: 'Nessuno ricorda un attaccante che non segna', promessa: 'gol, sempre' },
];

const ETA: readonly { value: number; nota: string; promessa: string }[] = [
  { value: 16, nota: 'Un ragazzino in prima squadra', promessa: 'più anni davanti' },
  { value: 17, nota: "L'età in cui di solito si esordisce", promessa: 'equilibrio' },
  { value: 18, nota: 'Un anno di vivaio in più alle spalle', promessa: 'parti più pronto' },
  { value: 19, nota: 'O adesso o mai più', promessa: 'meno margine' },
];

type Passo = 'nome' | 'ruolo' | 'eta' | 'paese' | 'campionato' | 'club';

export function Creazione({
  world,
  onStart,
}: {
  world: ReturnType<typeof useWorld>;
  onStart: (save: CareerSave) => void;
}) {
  const [passo, setPasso] = useState<Passo>('nome');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('FWD');
  const [age, setAge] = useState(17);
  const [country, setCountry] = useState('');
  const [leagueId, setLeagueId] = useState('');

  const campionati = world.leagues
    .filter((league) => league.country === country)
    .sort((a, b) => a.level - b.level);
  const lega = world.leagues.find((league) => league.id === leagueId);
  const club = world.clubs
    .filter((entry) => entry.leagueId === leagueId)
    .sort((a, b) => clubStrength(b.club) - clubStrength(a.club));

  const testata = (etichetta: string, titolo: string, sommario: string): ReactElement => (
    <>
      <header className="testata">
        <span className="testata-nome">{etichetta}</span>
        <span className="testata-data">nuova carriera</span>
      </header>
      <h2 className="titolone">{titolo}</h2>
      <p className="sommario">{sommario}</p>
    </>
  );

  const puntataSemplice = (testo: string, segno: 'bene' | 'neutro' = 'neutro'): ReactElement => (
    <span className="puntata">
      <span className={`faccia faccia-${segno}`}>
        <span className="faccia-esito">{testo}</span>
      </span>
    </span>
  );

  return (
    <section className="giornale">
      {passo === 'nome' && (
        <>
          {testata('CARTELLINO', 'Come ti chiami', 'Il nome che i telecronisti diranno per vent’anni.')}
          <input
            id="nome"
            className="bottone"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && name.trim() !== '') setPasso('ruolo');
            }}
            placeholder="Nome e cognome"
            style={{ fontSize: '1.2rem', textAlign: 'center' }}
          />
          <button
            type="button"
            className="avanti"
            disabled={name.trim() === ''}
            onClick={() => setPasso('ruolo')}
          >
            <span>Avanti</span>
            <span aria-hidden="true">→</span>
          </button>
        </>
      )}

      {passo === 'ruolo' && (
        <>
          {testata('RUOLO', 'In che ruolo giochi', `${name}, dove ti mettiamo in campo? Cambia tutto quello che verrà dopo.`)}
          <Scelte>
            {RUOLI.map((item) => (
              <Scelta
                key={item.id}
                sigla={item.id}
                titolo={item.label}
                nota={item.nota}
                etichetta="ti giudicheranno su"
                sicura
                puntata={puntataSemplice(item.promessa, 'bene')}
                onClick={() => {
                  setRole(item.id);
                  setPasso('eta');
                }}
              />
            ))}
          </Scelte>
        </>
      )}

      {passo === 'eta' && (
        <>
          {testata('ANAGRAFE', 'Quanti anni hai', 'Da che punto comincia la storia.')}
          <Scelte>
            {ETA.map((item) => (
              <Scelta
                key={item.value}
                sigla={String(item.value)}
                titolo={`${item.value} anni`}
                nota={item.nota}
                etichetta="cosa comporta"
                sicura
                puntata={puntataSemplice(item.promessa, 'bene')}
                onClick={() => {
                  setAge(item.value);
                  setPasso('paese');
                }}
              />
            ))}
          </Scelte>
        </>
      )}

      {passo === 'paese' && (
        <>
          {testata('IL MONDO', 'Dove cominci', 'Trentasei campionati veri, con le squadre e le rose di oggi.')}
          <div className="paesi">
            {world.countries.map((item) => (
              <button
                key={item}
                type="button"
                className="paese"
                onClick={() => {
                  setCountry(item);
                  setLeagueId('');
                  setPasso('campionato');
                }}
              >
                <span className="paese-bandiera" aria-hidden="true">{bandiera(item)}</span>
                <span>{inItaliano(item)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {passo === 'campionato' && (
        <>
          {testata(
            inItaliano(country).toUpperCase(),
            'Da che categoria parti',
            'Più in basso cominci, più dura è la salita — e più vale alla fine.',
          )}
          <Scelte>
            {campionati.map((item) => (
              <Scelta
                key={item.id}
                sigla={String(item.level)}
                titolo={item.name}
                sottotitolo={`${item.level}ª divisione · ${item.clubCount} squadre`}
                nota={
                  item.level === 1
                    ? 'Il palcoscenico più alto: qui si gioca poco da ragazzi.'
                    : 'Più spazio per giocare, meno vetrina.'
                }
                etichetta="nel punteggio finale"
                sicura={item.level === 1}
                puntata={puntataSemplice(
                  item.level === 1 ? 'nessun bonus' : `+${(item.level - 1) * 30} difficoltà`,
                  item.level === 1 ? 'neutro' : 'bene',
                )}
                onClick={() => {
                  setLeagueId(item.id);
                  void world.loadLeagues([item.id]);
                  setPasso('club');
                }}
              />
            ))}
          </Scelte>
        </>
      )}

      {passo === 'club' && (
        <>
          {testata(
            lega?.name.toUpperCase() ?? 'SQUADRE',
            'Chi ti fa firmare',
            'La squadra decide quanto giocherai: nelle grandi si fa panchina.',
          )}
          {club.length === 0 && <p className="tenue">Sto caricando le squadre…</p>}
          <Scelte>
            {club.map((entry) => {
              const forza = clubStrength(entry.club);
              return (
                <Scelta
                  key={entry.club.id}
                  sigla={sigla(entry.club.name)}
                  titolo={entry.club.name}
                  sottotitolo={`${entry.club.squad.length} in rosa`}
                  nota={
                    forza >= 78
                      ? 'Una corazzata: giocare qui da ragazzo è quasi impossibile.'
                      : forza >= 70
                        ? 'Squadra solida: ti tocca guadagnartelo.'
                        : 'Qui uno bravo trova subito spazio.'
                  }
                  etichetta="forza della rosa"
                  sicura={forza < 72}
                  puntata={
                    <span className="puntata">
                      <span className={`faccia faccia-${forza >= 76 ? 'male' : 'bene'}`}>
                        <b className="faccia-quota">overall</b>
                        <span className="faccia-esito">{forza.toFixed(0)}</span>
                      </span>
                    </span>
                  }
                  onClick={() =>
                    onStart(
                      newSave({
                        name,
                        nationality: country,
                        role,
                        age,
                        leagueLevel: lega?.level ?? 1,
                        startClubId: entry.club.id,
                        seed: randomSeed(),
                      }),
                    )
                  }
                />
              );
            })}
          </Scelte>
        </>
      )}

      {passo !== 'nome' && (
        <button
          type="button"
          className="bottone"
          style={{ marginTop: '1rem', textAlign: 'center' }}
          onClick={() =>
            setPasso(
              passo === 'ruolo' ? 'nome'
              : passo === 'eta' ? 'ruolo'
              : passo === 'paese' ? 'eta'
              : passo === 'campionato' ? 'paese'
              : 'campionato',
            )
          }
        >
          ← Torna indietro
        </button>
      )}
    </section>
  );
}
