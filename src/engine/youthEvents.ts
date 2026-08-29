import type { Rng } from './rng';
import type { Dilemma, DilemmaEffects, DilemmaOption, DilemmaOutcome, MarkId } from './types';
import type { Role } from '../world/types';
import type { YouthApproach, YouthSeason } from './youth';

/**
 * Gli episodi del vivaio: quello che succede *fra* una scelta di allenamento e l'altra.
 *
 * Il vivaio dura due o tre anni e finora chiedeva sempre la stessa cosa — come ti
 * alleni — tre volte di fila. Qui ogni anno ha una sua storia: la chiamata della prima
 * squadra, gli esami, il corpo che cresce di otto centimetri in un'estate. Le poste
 * sono quelle vere del motore (`DilemmaEffects`), così la puntata si mostra con gli
 * stessi pezzi dei bivi della carriera e nessun numero è di facciata.
 */
export interface YouthEventContext {
  year: number;
  age: number;
  clubName: string;
  overall: number;
  role: Role;
  approach: YouthApproach;
  /** L'anno appena giocato: presenze, gol, media. */
  season: YouthSeason;
  /** Episodi già capitati: uno non si ripete nella stessa carriera. */
  usedEventIds: readonly string[];
}

export interface YouthEventEntry {
  id: string;
  weight: number;
  when: (context: YouthEventContext) => boolean;
  build: (context: YouthEventContext) => Dilemma;
}

const bene = (chance: number, text: string, effects: DilemmaEffects): DilemmaOutcome => ({
  chance, text, effects,
});

/**
 * Dieci situazioni da settore giovanile. Nessuna parla di mercato o di classifica:
 * a quattordici anni non esistono ancora.
 */
export const YOUTH_EVENT_CATALOG: readonly YouthEventEntry[] = [
  {
    id: 'provino-con-la-prima',
    weight: 3,
    when: (context) => context.overall >= 45 || context.season.rating >= 6.8,
    build: (context) => ({
      id: 'provino-con-la-prima',
      title: 'Il giovedì con i grandi',
      text: `${context.clubName}. Il mister della prima squadra ha bisogno di otto ragazzi per la partitella del giovedì, e il tuo nome è sulla lista. Sono novanta minuti con gente che di mestiere fa questo.`,
      options: [
        {
          id: 'fatti-notare',
          label: 'Vai per farti notare',
          stake: 'Puoi restare negli occhi di chi conta, o farti male davanti a tutti.',
          outcomes: [
            bene(0.6, 'Tieni il campo senza abbassare gli occhi. Il mister chiede il tuo nome allo staff, e lo ripete.', { overall: 1, addMark: { id: 'leader-riconosciuto', intensity: 0.4 } }),
            bene(0.4, 'Ti passano addosso per un\'ora. Torni negli spogliatoi con la sensazione di essere piccolo.', { addMark: { id: 'carattere-fragile', intensity: 0.4 } }),
          ],
        },
        {
          id: 'fai-il-tuo',
          label: 'Gioca semplice e non sbagliare',
          stake: 'Nessuno si ricorderà di te, ma nemmeno in male.',
          outcomes: [
            bene(1, 'Un\'ora pulita, due palloni giocati bene, niente di clamoroso. Ti rimandano giù con una pacca.', { overall: 1 }),
          ],
        },
      ],
    }),
  },
  {
    id: 'la-scuola',
    weight: 3,
    when: (context) => context.age <= 16,
    build: () => ({
      id: 'la-scuola',
      title: 'Gli esami cadono sul torneo',
      text: 'La sessione di recupero è nella stessa settimana del torneo di Pasqua, quello che guardano tutti. Non si possono fare tutte e due.',
      options: [
        {
          id: 'vai-al-torneo',
          label: 'Vai al torneo',
          stake: 'Una settimana che vale un anno, o un conto da pagare a giugno.',
          outcomes: [
            bene(0.55, 'Quattro partite in cinque giorni: esci dal torneo un giocatore diverso da quello che era entrato.', { overall: 2 }),
            bene(0.45, 'Il torneo va bene, giugno no. Tra recuperi e musi lunghi in casa arrivi all\'estate svuotato.', { addMark: { id: 'carattere-fragile', intensity: 0.4 } }),
          ],
        },
        {
          id: 'prima-la-scuola',
          label: 'Prima la scuola',
          stake: 'Perdi la vetrina, ma lo staff se lo segna.',
          outcomes: [
            bene(1, 'Dai gli esami e torni al campo il lunedì. Al club nessuno lo dice, ma se lo ricordano tutti.', { overall: 1, addMark: { id: 'uomo-spogliatoio', intensity: 0.5 } }),
          ],
        },
      ],
    }),
  },
  {
    id: 'il-cambio-di-ruolo',
    weight: 2,
    when: (context) => context.year >= 2,
    build: (context) => ({
      id: 'il-cambio-di-ruolo',
      title: 'Ti vogliono spostare',
      text: `L'allenatore delle giovanili di ${context.clubName} dice che nel tuo ruolo, con quel fisico, non ci arrivi. Ti vuole provare qualche metro più indietro.`,
      options: [
        {
          id: 'accetta',
          label: 'Provaci dove ti mettono',
          stake: 'Può essere il posto che ti aspettava, o un anno buttato a capire dove stare.',
          outcomes: [
            bene(0.55, 'Da lì vedi il campo tutto davanti a te. Dopo due mesi non torneresti indietro nemmeno se te lo chiedessero.', { overall: 3 }),
            bene(0.45, 'Non è il tuo posto e si vede. A marzo ti rimettono dov\'eri, con un anno in meno.', { overall: -1 }),
          ],
        },
        {
          id: 'resta-dov-eri',
          label: 'Chiedi di restare dov\'eri',
          stake: 'Il tuo ruolo resta il tuo, ma l\'allenatore la prende come una risposta.',
          outcomes: [
            bene(1, 'Rimani dove sai stare e cresci lì. Il rapporto con l\'allenatore, però, si raffredda.', { overall: 1, addMark: { id: 'rissa-col-mister', intensity: 0.35 } }),
          ],
        },
      ],
    }),
  },
  {
    id: 'il-piu-forte-del-gruppo',
    weight: 3,
    when: () => true,
    build: () => ({
      id: 'il-piu-forte-del-gruppo',
      title: 'Quello più forte di te',
      text: 'Nel gruppo c\'è uno che è avanti a tutti: gioca prima, corre di più, e lo sanno anche i dirigenti. Ogni allenamento passa da come decidi di stargli vicino.',
      options: [
        {
          id: 'marcalo',
          label: 'Marcalo a ogni partitella',
          stake: 'Il metro di paragone più duro che hai, e non perdona.',
          outcomes: [
            bene(0.5, 'Sei mesi a rincorrerlo e a un certo punto non lo rincorri più. È così che si cresce in fretta.', { overall: 2 }),
            bene(0.5, 'Ti fa girare la testa ogni giovedì. A forza di perdere i duelli cominci a evitarli.', { addMark: { id: 'carattere-fragile', intensity: 0.3 } }),
          ],
        },
        {
          id: 'la-tua-partita',
          label: 'Gioca la tua partita',
          stake: 'Cresci al tuo passo, senza confronti.',
          outcomes: [
            bene(1, 'Fai le tue cose e le fai bene. Nessuno ti guarda per confronto, e va bene così.', { overall: 1 }),
          ],
        },
      ],
    }),
  },
  {
    id: 'il-corpo-cambia',
    weight: 3,
    when: (context) => context.age <= 16,
    build: () => ({
      id: 'il-corpo-cambia',
      title: 'Otto centimetri in un\'estate',
      text: 'Sei cresciuto tutto insieme e il corpo non ti obbedisce più: le ginocchia fanno male dopo ogni seduta, e il fisioterapista usa la parola «crescita» come se spiegasse tutto.',
      options: [
        {
          id: 'tira-dritto',
          label: 'Continua con i carichi',
          stake: 'O il fisico si assesta correndo, o te lo porti dietro per sempre.',
          outcomes: [
            bene(0.6, 'Il corpo si assesta lavorando: a novembre non senti più niente e sei un altro atleta.', { overall: 3 }),
            bene(0.4, 'Il dolore non se ne va più. Da adesso quel ginocchio è una cosa di cui tenere conto, per tutta la carriera.', { overall: -1, addMark: { id: 'ginocchio-fragile', intensity: 0.5 } }),
          ],
        },
        {
          id: 'fermati',
          label: 'Fermati un mese',
          stake: 'Perdi mezza stagione di lavoro, ma non perdi le ginocchia.',
          outcomes: [
            bene(1, 'Un mese di palestra leggera e piscina. Torni indietro rispetto agli altri, ma torni intero.', { overall: 1 }),
          ],
        },
      ],
    }),
  },
  {
    id: 'la-chiamata-dell-under',
    weight: 2,
    when: (context) => context.overall >= 48,
    build: (context) => ({
      id: 'la-chiamata-dell-under',
      title: 'La chiamata dell\'Under',
      text: `Ti convocano per uno stage della nazionale giovanile. Sono dieci giorni, e nei dieci giorni a ${context.clubName} qualcun altro gioca al posto tuo.`,
      options: [
        {
          id: 'vai',
          label: 'Vai in nazionale',
          stake: 'La vetrina più grande che esista a quest\'età, pagata con il posto.',
          outcomes: [
            bene(0.65, 'Torni con la maglia della nazionale nell\'armadio e la sensazione di stare al livello giusto.', { overall: 1, addMark: { id: 'leader-riconosciuto', intensity: 0.4 } }),
            bene(0.35, 'Dieci giorni in panchina laggiù, e qui intanto il posto se l\'è preso un altro.', { minutesDelta: -0.05 }),
          ],
        },
        {
          id: 'resta',
          label: 'Resta a prenderti il posto',
          stake: 'Nessuno ti guarda da fuori, ma qui dentro giochi.',
          outcomes: [
            bene(1, 'Tre partite da titolare mentre gli altri sono via: quando tornano, la maglia è tua.', { overall: 1, minutesDelta: 0.05 }),
          ],
        },
      ],
    }),
  },
  {
    id: 'il-procuratore-precoce',
    weight: 2,
    when: (context) => context.year >= 2 && context.overall >= 46,
    build: () => ({
      id: 'il-procuratore-precoce',
      title: 'Un uomo dietro la rete',
      text: 'C\'è un tale che viene a vedere gli allenamenti da tre settimane e alla fine si presenta: dice che segue ragazzi come te e che sa dove portarli. Hai quindici anni.',
      options: [
        {
          id: 'firmi',
          label: 'Ascoltalo e firma con lui',
          stake: 'Può aprirti porte che non sai nemmeno che esistano, o metterti addosso un\'etichetta.',
          outcomes: [
            bene(0.6, 'In due mesi ti fa vedere da gente che non ti avrebbe mai visto. Qualcosa si muove davvero.', { minutesDelta: 0.08 }),
            bene(0.4, 'Sparisce dopo l\'estate, ma al club hanno saputo tutto. Da quel giorno sei uno che sta già guardando altrove.', { addMark: { id: 'promessa-tradita', intensity: 0.4 } }),
          ],
        },
        {
          id: 'lo-mandi-via',
          label: 'Digli di parlare col club',
          stake: 'Niente scorciatoie, e la società lo viene a sapere.',
          outcomes: [
            bene(1, 'Lo indirizzi alla segreteria e la cosa finisce lì. Al club apprezzano più di quanto dicano.', { overall: 1, addMark: { id: 'uomo-spogliatoio', intensity: 0.4 } }),
          ],
        },
      ],
    }),
  },
  {
    id: 'lontano-da-casa',
    weight: 3,
    when: (context) => context.year === 1,
    build: (context) => ({
      id: 'lontano-da-casa',
      title: 'Il primo inverno in convitto',
      text: `Il convitto di ${context.clubName} è una stanza da due, la sveglia alle sei e mezza e la domenica sera che non finisce mai. A gennaio pensi a casa più di quanto pensi al campo.`,
      options: [
        {
          id: 'resti',
          label: 'Resta e stringi i denti',
          stake: 'O ne esci più grande, o ne esci consumato.',
          outcomes: [
            bene(0.6, 'A marzo la stanza è diventata casa. Il gruppo si accorge che sei uno su cui si può contare.', { overall: 2, addMark: { id: 'leader-riconosciuto', intensity: 0.3 } }),
            bene(0.4, 'Sei mesi di sonno storto e telefonate lunghe. Non si vede in campo, ma si sente.', { addMark: { id: 'carattere-fragile', intensity: 0.5 } }),
          ],
        },
        {
          id: 'torni-a-casa',
          label: 'Torna a dormire a casa',
          stake: 'Due ore di pullman al giorno, ma la sera sei a casa tua.',
          outcomes: [
            bene(1, 'Sveglia più presto, rientro più tardi, e la testa dove deve stare.', { overall: 1, addMark: { id: 'tornato-a-casa', intensity: 0.5 } }),
          ],
        },
      ],
    }),
  },
  {
    id: 'il-provino-altrove',
    weight: 2,
    when: (context) => context.year >= 2,
    build: (context) => ({
      id: 'il-provino-altrove',
      title: 'Un altro club ti ha visto',
      text: `Una società più grande ha chiesto di vederti per tre giorni. A ${context.clubName} non l'hanno ancora saputo, e chiedere il permesso significa dirlo.`,
      options: [
        {
          id: 'vai-a-vedere',
          label: 'Vai a farti vedere',
          stake: 'Tre giorni che possono cambiarti il posto, o bruciarti quello che hai.',
          outcomes: [
            bene(0.5, 'Torni con una relazione ottima e la voce arriva anche qui: adesso ti guardano con altri occhi.', { overall: 2, minutesDelta: 0.06 }),
            bene(0.5, 'Il provino non lascia il segno, ma al club hanno saputo che sei andato.', { addMark: { id: 'promessa-tradita', intensity: 0.5 } }),
          ],
        },
        {
          id: 'resti-fedele',
          label: 'Resta dove sei cresciuto',
          stake: 'Rinunci a una vetrina, guadagni una casa.',
          outcomes: [
            bene(1, 'Dici di no senza farne una storia. Qui dentro diventi uno di famiglia.', { overall: 1, addMark: { id: 'bandiera', intensity: 0.5 } }),
          ],
        },
      ],
    }),
  },
  {
    id: 'la-finale-del-torneo',
    weight: 2,
    when: (context) => context.season.appearances >= 15,
    build: () => ({
      id: 'la-finale-del-torneo',
      title: 'La finale finisce ai rigori',
      text: 'Finale del torneo di categoria, zero a zero dopo i supplementari. L\'allenatore gira con il foglio in mano e cerca il quinto rigorista guardando negli occhi uno per uno.',
      options: [
        {
          id: 'lo-prendi-tu',
          label: 'Alza la mano',
          stake: 'Il tiro che ti fa conoscere, o quello che ti resta addosso.',
          outcomes: [
            bene(0.55, 'Lo metti dove il portiere non arriva. Per un anno intero sei quello che ha segnato il rigore.', { overall: 2, addMark: { id: 'beniamino-dei-tifosi', intensity: 0.4 } }),
            bene(0.45, 'Traversa. Il rumore lo senti ancora a distanza di mesi.', { overall: -1, addMark: { id: 'carattere-fragile', intensity: 0.4 } }),
          ],
        },
        {
          id: 'lo-lasci',
          label: 'Lascialo al capitano',
          stake: 'Niente rischio, e niente storia da raccontare.',
          outcomes: [
            bene(1, 'Guardi dal centrocampo abbracciato agli altri. Comunque vada, non è la tua sera.', { overall: 1, addMark: { id: 'uomo-spogliatoio', intensity: 0.4 } }),
          ],
        },
      ],
    }),
  },
];

/** Cosa è successo in un episodio: entra nel racconto e nel salvataggio. */
export interface YouthEpisode {
  year: number;
  age: number;
  eventId: string;
  title: string;
  text: string;
  optionId: string;
  optionLabel: string;
  outcomeText: string;
  /** Punti di overall dell'esito, già applicati. */
  overall: number;
  minutesDelta: number;
  mark: { id: MarkId; intensity: number } | null;
}

/** L'episodio dell'anno, se ce n'è uno compatibile con la situazione. */
export function pickYouthEvent(context: YouthEventContext, rng: Rng): Dilemma | null {
  const pool = YOUTH_EVENT_CATALOG.filter(
    (entry) => entry.when(context) && !context.usedEventIds.includes(entry.id),
  );
  if (pool.length === 0) return null;

  const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng.next() * totalWeight;
  const chosen = pool.find((entry) => {
    roll -= entry.weight;
    return roll <= 0;
  }) ?? pool[pool.length - 1]!;

  return chosen.build(context);
}

export function resolveYouthOption(option: DilemmaOption, rng: Rng): DilemmaOutcome {
  let roll = rng.next();
  for (const outcome of option.outcomes) {
    roll -= outcome.chance;
    if (roll <= 0) return outcome;
  }
  return option.outcomes[option.outcomes.length - 1]!;
}
