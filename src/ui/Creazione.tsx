'use client';

import { useState } from 'react';
import type { CareerSave } from '../engine/play';
import type { Role } from '../world/types';
import { newSave, randomSeed } from './newSave';
import { useWorld } from './useWorld';

const RUOLI: readonly { id: Role; label: string; nota: string }[] = [
  { id: 'GK', label: 'Portiere', nota: 'Ti giudicano su parate e clean sheet' },
  { id: 'DEF', label: 'Difensore', nota: 'Contano la porta inviolata e la continuità' },
  { id: 'MID', label: 'Centrocampista', nota: 'Assist, gol e il gioco che passa da te' },
  { id: 'FWD', label: 'Attaccante', nota: 'Ti pesano i gol, sempre' },
];

const ETA: readonly { value: number; nota: string }[] = [
  { value: 16, nota: 'Più tempo per crescere, meno pronto' },
  { value: 17, nota: '' },
  { value: 18, nota: '' },
  { value: 19, nota: 'Già formato, meno margine' },
];

export function Creazione({
  world,
  onStart,
}: {
  world: ReturnType<typeof useWorld>;
  onStart: (save: CareerSave) => void;
}) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('FWD');
  const [age, setAge] = useState(17);
  const [country, setCountry] = useState('');
  const [leagueId, setLeagueId] = useState('');
  const [clubId, setClubId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const leaguesOfCountry = world.leagues.filter((league) => league.country === country);
  const clubsOfLeague = world.clubs.filter((entry) => entry.leagueId === leagueId);
  const chosenLeague = world.leagues.find((league) => league.id === leagueId);

  return (
    <>
      <h1>Il tuo calciatore</h1>

      <div className="card">
        <label htmlFor="nome">Come si chiama</label>
        <input
          id="nome"
          className="bottone"
          style={{ marginTop: '.4rem' }}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nome e cognome"
        />
      </div>

      <div className="card">
        <p>In che ruolo gioca</p>
        <div className="griglia">
          {RUOLI.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`bottone${role === item.id ? ' bottone-scelto' : ''}`}
              onClick={() => setRole(item.id)}
            >
              {item.label}
              <span className="posta">{item.nota}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <p>Quanti anni ha</p>
        <div className="griglia">
          {ETA.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`bottone${age === item.value ? ' bottone-scelto' : ''}`}
              onClick={() => setAge(item.value)}
            >
              {item.value} anni
              {item.nota !== '' && <span className="posta">{item.nota}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <p>Dove comincia</p>
        <select
          aria-label="Nazione"
          className="bottone"
          value={country}
          onChange={(event) => {
            setCountry(event.target.value);
            setLeagueId('');
            setClubId('');
          }}
        >
          <option value="">Scegli la nazione</option>
          {world.countries.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>

        {country !== '' && (
          <select
            aria-label="Campionato"
            className="bottone"
            style={{ marginTop: '.6rem' }}
            value={leagueId}
            onChange={(event) => {
              const id = event.target.value;
              setLeagueId(id);
              setClubId('');
              if (id !== '') void world.loadLeagues([id]);
            }}
          >
            <option value="">Scegli il campionato</option>
            {leaguesOfCountry.map((league) => (
              <option key={league.id} value={league.id}>
                {league.name} — {league.level}ª divisione
              </option>
            ))}
          </select>
        )}

        {leagueId !== '' && clubsOfLeague.length > 0 && (
          <select
            aria-label="Club"
            className="bottone"
            style={{ marginTop: '.6rem' }}
            value={clubId}
            onChange={(event) => setClubId(event.target.value)}
          >
            <option value="">Scegli il club</option>
            {[...clubsOfLeague]
              .sort((a, b) => a.club.name.localeCompare(b.club.name))
              .map((entry) => (
                <option key={entry.club.id} value={entry.club.id}>{entry.club.name}</option>
              ))}
          </select>
        )}

        {chosenLeague && chosenLeague.level > 1 && (
          <p className="posta">
            Partire dalla {chosenLeague.level}ª divisione è più duro, ma nel punteggio finale
            vale di più.
          </p>
        )}
      </div>

      {error !== null && <p style={{ color: 'var(--allarme)' }}>{error}</p>}
      {world.error !== null && <p style={{ color: 'var(--allarme)' }}>{world.error}</p>}

      <button
        type="button"
        className="bottone bottone-forte"
        disabled={clubId === '' || name.trim() === ''}
        onClick={() => {
          try {
            onStart(
              newSave({
                name,
                nationality: country === '' ? 'Italy' : country,
                role,
                age,
                leagueLevel: chosenLeague?.level ?? 1,
                startClubId: clubId,
                seed: randomSeed(),
              }),
            );
          } catch (problem) {
            setError(problem instanceof Error ? problem.message : 'Qualcosa non va');
          }
        }}
      >
        Firma il primo contratto
      </button>
    </>
  );
}
