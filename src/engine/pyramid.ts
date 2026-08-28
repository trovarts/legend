import type { Club, LeagueSummary, Role, WorldPlayer } from '../world/types';
import { createRng, type Rng } from './rng';

/**
 * Le divisioni minori.
 *
 * Il dataset reale copre le prime due serie: sotto, il calcio esiste lo stesso ed è dove
 * comincia quasi ogni carriera. Qui le costruiamo dalle città vere di ogni paese più il
 * soprannome cromatico con cui le squadre si chiamano davvero — «Pontedera Neri»,
 * «Brianza Biancorossi» — e le rose le genera il motore, coerenti col livello.
 *
 * Le prime due divisioni restano quelle vere: qui non si tocca niente.
 */

const CITTA: Record<string, readonly string[]> = {
  Italy: [
    'Pontedera', 'Carpi', 'Legnano', 'Fermo', 'Rieti', 'Avellino', 'Matera', 'Sondrio',
    'Imperia', 'Lecco', 'Gubbio', 'Fano', 'Chieti', 'Nocera', 'Sanremo', 'Trapani',
    'Casale', 'Vercelli', 'Alessandria', 'Savona', 'Foligno', 'Teramo', 'Andria',
    'Barletta', 'Marsala', 'Acireale', 'Siracusa', 'Olbia', 'Nuoro', 'Aosta',
    'Belluno', 'Rovigo', 'Ferrara', 'Ravenna', 'Forlì', 'Prato', 'Massa', 'Grosseto',
    'Viterbo', 'Latina', 'Frosinone', 'Cassino', 'Benevento', 'Potenza', 'Cosenza',
    'Crotone', 'Vibo', 'Ragusa', 'Agrigento', 'Caltanissetta',
  ],
  England: [
    'Barnsley', 'Rotherham', 'Crewe', 'Walsall', 'Stevenage', 'Grimsby', 'Carlisle',
    'Hartlepool', 'Rochdale', 'Oldham', 'Bury', 'Yeovil', 'Torquay', 'Exeter',
    'Cheltenham', 'Newport', 'Wrexham', 'Chesterfield', 'Mansfield', 'Scunthorpe',
    'Doncaster', 'Shrewsbury', 'Burton', 'Fleetwood', 'Morecambe', 'Accrington',
    'Northampton', 'Colchester', 'Southend', 'Gillingham',
  ],
  Spain: [
    'Cartagena', 'Albacete', 'Burgos', 'Lugo', 'Ponferrada', 'Alcorcón', 'Fuenlabrada',
    'Sabadell', 'Castellón', 'Algeciras', 'Linares', 'Badajoz', 'Cáceres', 'Melilla',
    'Ceuta', 'Talavera', 'Zamora', 'Salamanca', 'Ourense', 'Pontevedra', 'Ferrol',
    'Avilés', 'Langreo', 'Irún', 'Amorebieta', 'Calahorra', 'Tudela', 'Teruel',
    'Manacor', 'Ibiza',
  ],
  France: [
    'Quevilly', 'Chambly', 'Concarneau', 'Cholet', 'Orléans', 'Bourg', 'Annecy',
    'Martigues', 'Fréjus', 'Béziers', 'Sète', 'Nîmes', 'Rodez', 'Aurillac', 'Vierzon',
    'Épinal', 'Belfort', 'Colmar', 'Sedan', 'Beauvais', 'Créteil', 'Villefranche',
    'Bastia', 'Ajaccio', 'Boulogne', 'Dunkerque', 'Valenciennes', 'Amiens', 'Laval', 'Niort',
  ],
  Germany: [
    'Aalen', 'Meppen', 'Verl', 'Lotte', 'Zwickau', 'Halle', 'Jena', 'Erfurt', 'Chemnitz',
    'Cottbus', 'Rostock', 'Kiel', 'Lübeck', 'Oldenburg', 'Osnabrück', 'Paderborn',
    'Siegen', 'Koblenz', 'Trier', 'Worms', 'Offenbach', 'Hanau', 'Ulm', 'Reutlingen',
    'Pforzheim', 'Bayreuth', 'Regensburg', 'Ingolstadt', 'Passau', 'Landshut',
  ],
};

/** I soprannomi con cui le squadre si chiamano davvero. */
const SOPRANNOMI: readonly string[] = [
  'Rossoneri', 'Biancorossi', 'Nerazzurri', 'Bianconeri', 'Rossoblù', 'Gialloblù',
  'Granata', 'Verdeblù', 'Neri', 'Azzurri', 'Verdi', 'Arancioni', 'Bianchi', 'Rossi',
];

/** Come nella realtà: la terza serie è più larga della quarta a girone singolo. */
const CLUB_PER_GIRONE: Record<number, number> = { 3: 20, 4: 18 };

export interface GeneratedLeague {
  summary: LeagueSummary;
  clubs: Club[];
}

function rosaGenerata(
  clubId: string,
  forza: number,
  country: string,
  nomi: readonly string[],
  rng: Rng,
): WorldPlayer[] {
  const RUOLI: readonly { role: Role; quanti: number }[] = [
    { role: 'GK', quanti: 3 },
    { role: 'DEF', quanti: 8 },
    { role: 'MID', quanti: 8 },
    { role: 'FWD', quanti: 5 },
  ];
  const rosa: WorldPlayer[] = [];
  const presi = new Set<string>();
  for (const gruppo of RUOLI) {
    for (let indice = 0; indice < gruppo.quanti; indice += 1) {
      const overall = Math.max(35, Math.round(forza + rng.int(-6, 5)));
      const eta = rng.int(18, 34);
      // Un compagno di reparto senza nome non è un ostacolo, è una riga vuota:
      // i nomi arrivano dai calciatori veri di quel paese.
      const nome = (() => {
        if (nomi.length === 0) return `Giocatore ${rosa.length + 1}`;
        const partenza = rng.int(0, nomi.length - 1);
        for (let passo = 0; passo < nomi.length; passo += 1) {
          const candidato = nomi[(partenza + passo) % nomi.length]!;
          if (!presi.has(candidato)) {
            presi.add(candidato);
            return candidato;
          }
        }
        return `${nomi[partenza]!} jr`;
      })();
      rosa.push({
        id: `${clubId}-g${rosa.length}`,
        name: nome,
        age: eta,
        role: gruppo.role,
        overall,
        potential: Math.min(90, overall + Math.max(0, 26 - eta)),
        // In queste categorie i cartellini valgono poco: decine di migliaia, non milioni.
        valueEur: Math.max(10_000, Math.round((overall - 30) ** 2 * 900)),
        nationality: country,
      });
    }
  }
  return rosa;
}

/**
 * Costruisce le divisioni sotto la seconda serie di un paese: due livelli, tre gironi
 * ciascuno, come nella piramide vera.
 */
export function buildLowerLeagues(
  country: string,
  seed: number,
  livelli: readonly number[] = [3, 4],
  /** Nomi veri di calciatori di quel paese, da cui pescare i comprimari. */
  nomi: readonly string[] = [],
): GeneratedLeague[] {
  const citta = CITTA[country];
  if (!citta || citta.length < 12) return [];

  const rng = createRng(seed ^ 0x1f3a5c7d);
  const leghe: GeneratedLeague[] = [];
  const usati = new Set<string>();
  let indiceCitta = 0;

  /** Città più soprannome, girando finché non esce un nome che non esiste già. */
  const nomeClub = (citta1: string): string => {
    const partenza = rng.int(0, SOPRANNOMI.length - 1);
    for (let passo = 0; passo < SOPRANNOMI.length; passo += 1) {
      const nome = `${citta1} ${SOPRANNOMI[(partenza + passo) % SOPRANNOMI.length]!}`;
      if (!usati.has(nome)) {
        usati.add(nome);
        return nome;
      }
    }
    const ripiego = `${citta1} ${SOPRANNOMI[partenza]!} ${usati.size}`;
    usati.add(ripiego);
    return ripiego;
  };

  for (const livello of livelli) {
    for (const girone of ['A', 'B', 'C']) {
      const id = `${country.toLowerCase().replace(/[^a-z]/g, '')}-${livello}${girone.toLowerCase()}`;
      const nome = `${livello === 3 ? 'Terza' : 'Quarta'} Divisione · Girone ${girone}`;
      const clubs: Club[] = [];

      const quanti = CLUB_PER_GIRONE[livello] ?? 18;
      for (let indice = 0; indice < quanti; indice += 1) {
        const citta1 = citta[indiceCitta % citta.length]!;
        indiceCitta += 1;
        const clubId = `${id}-c${indice}`;
        // Più si scende, più le rose sono modeste: è quello che rende dura la gavetta.
        const forza = (livello === 3 ? 62 : 55) + rng.int(-4, 4);
        clubs.push({
          id: clubId,
          name: nomeClub(citta1),
          squad: rosaGenerata(clubId, forza, country, nomi, rng),
        });
      }

      leghe.push({
        summary: { id, name: nome, country, level: livello, clubCount: clubs.length },
        clubs,
      });
    }
  }

  return leghe;
}

export function countriesWithPyramid(): string[] {
  return Object.keys(CITTA);
}
