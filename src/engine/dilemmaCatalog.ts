import { markIntensity } from './marks.js';
import type { Dilemma, Injury, Mark } from './types.js';

export interface DilemmaContext {
  season: number;
  age: number;
  overall: number;
  minutesShare: number;
  injury: Injury | null;
  marks: readonly Mark[];
  clubName: string;
  leagueLevel: number;
  contractYearsLeft: number;
  wonSomething: boolean;
}

export interface DilemmaEntry {
  id: string;
  /** Peso nell'estrazione: quanto spesso questo bivio si presenta, fra quelli possibili. */
  weight: number;
  when: (context: DilemmaContext) => boolean;
  build: (context: DilemmaContext) => Dilemma;
}

/**
 * Il catalogo dei bivi della V1: otto situazioni, ognuna con la posta dichiarata.
 * I testi stanno qui e non nel motore, così la traduzione della Fase 5 non tocca la logica.
 */
export const DILEMMA_CATALOG: readonly DilemmaEntry[] = [
  {
    id: 'rientro-anticipato',
    weight: 3,
    when: (context) => context.injury !== null && context.injury.severity !== 'lieve',
    build: (context) => ({
      id: 'rientro-anticipato',
      title: 'Il ginocchio non tiene',
      text: `Il medico del ${context.clubName} parla di ${context.injury?.matchesOut ?? 10} partite. L'agente ricorda che una stagione in bianco, a ${context.age} anni, la gente la nota.`,
      options: [
        {
          id: 'aspetta',
          label: 'Aspetta di guarire davvero',
          stake: 'Perdi mezza stagione, ma torni intero.',
          outcomes: [
            { chance: 1, text: 'Rientri quando il ginocchio è a posto. Nessuno strascico.', effects: { minutesDelta: -0.1 } },
          ],
        },
        {
          id: 'anticipa',
          label: 'Rientra un mese prima',
          stake: '70% torni come prima, 30% te lo porti dietro per sempre.',
          outcomes: [
            { chance: 0.7, text: 'Il rientro regge. Sei di nuovo in campo prima del previsto.', effects: { minutesDelta: 0.08 } },
            { chance: 0.3, text: 'Il ginocchio cede di nuovo. Da qui in avanti dovrai conviverci.', effects: { addMark: { id: 'ginocchio-fragile', intensity: 0.8 }, overall: -2, retirementDelta: -2 } },
          ],
        },
        {
          id: 'infiltrazioni',
          label: 'Infiltrazioni, gioca comunque',
          stake: 'Giochi subito e ti fai notare, ma bruci anni di carriera.',
          outcomes: [
            { chance: 0.55, text: 'Stringi i denti e giochi. Lo spogliatoio se lo ricorda.', effects: { minutesDelta: 0.12, addMark: { id: 'leader-riconosciuto', intensity: 0.5 }, retirementDelta: -3 } },
            { chance: 0.45, text: 'Il dolore non passa più. Il ginocchio è compromesso.', effects: { addMark: { id: 'ginocchio-fragile', intensity: 1 }, overall: -3, retirementDelta: -4 } },
          ],
        },
      ],
    }),
  },
  {
    id: 'panchina-lunga',
    weight: 3,
    when: (context) => context.minutesShare < 0.25 && context.injury === null,
    build: (context) => ({
      id: 'panchina-lunga',
      title: 'Non giochi più',
      text: `Sono mesi che al ${context.clubName} entri nei finali. Il mister non ti guarda nemmeno più durante il riscaldamento.`,
      options: [
        {
          id: 'lavora',
          label: 'Testa bassa e lavora',
          stake: 'Nessun rischio, nessuna scorciatoia.',
          outcomes: [
            { chance: 0.6, text: 'A gennaio qualcosa si muove: torni fra i convocati.', effects: { minutesDelta: 0.08, addMark: { id: 'uomo-spogliatoio', intensity: 0.4 } } },
            { chance: 0.4, text: 'Niente da fare. La stagione passa dalla panchina.', effects: { minutesDelta: -0.03 } },
          ],
        },
        {
          id: 'parla',
          label: 'Vai a parlare col mister',
          stake: 'Può aprirti le porte o chiudertele in faccia.',
          outcomes: [
            { chance: 0.5, text: 'Il confronto è duro ma onesto. Ti dà una possibilità.', effects: { minutesDelta: 0.18 } },
            { chance: 0.5, text: 'Finisce male. Da domani ti allena col gruppo dei fuori rosa.', effects: { minutesDelta: -0.12, addMark: { id: 'rissa-col-mister', intensity: 0.7 } } },
          ],
        },
        {
          id: 'chiedi-cessione',
          label: 'Chiedi la cessione',
          stake: 'Te ne vai a giocare, ma la piazza non perdona.',
          outcomes: [
            { chance: 1, text: `Chiedi di andare via. Il ${context.clubName} ti mette sul mercato.`, effects: { addMark: { id: 'mercenario', intensity: 0.5 }, minutesDelta: 0.05 } },
          ],
        },
      ],
    }),
  },
  {
    id: 'rinnovo-o-addio',
    weight: 3,
    when: (context) => context.contractYearsLeft <= 0,
    build: (context) => ({
      id: 'rinnovo-o-addio',
      title: 'Il contratto scade',
      text: `Il ${context.clubName} mette sul tavolo il rinnovo. Il tuo agente dice che aspettando la scadenza guadagneresti il doppio altrove.`,
      options: [
        {
          id: 'rinnova',
          label: 'Firma il rinnovo',
          stake: 'Meno soldi, ma la piazza ti adotta.',
          outcomes: [
            { chance: 1, text: 'Firmi. I tifosi apprezzano chi resta.', effects: { addMark: { id: 'bandiera', intensity: 0.5 }, minutesDelta: 0.05 } },
          ],
        },
        {
          id: 'aspetta-scadenza',
          label: 'Aspetta la scadenza',
          stake: 'Guadagni di più, ma passi per uno che se ne va a zero.',
          outcomes: [
            { chance: 0.6, text: 'Arrivi a scadenza con le offerte in mano. Affare fatto.', effects: { valueMultiplier: 1.15, addMark: { id: 'mercenario', intensity: 0.4 } } },
            { chance: 0.4, text: 'La piazza la prende malissimo. Ogni pallone toccato è un fischio.', effects: { addMark: { id: 'promessa-tradita', intensity: 0.6 }, minutesDelta: -0.08 } },
          ],
        },
      ],
    }),
  },
  {
    id: 'intervista-dopo-la-sconfitta',
    weight: 2,
    when: (context) => context.minutesShare >= 0.35 && !context.wonSomething,
    build: (context) => ({
      id: 'intervista-dopo-la-sconfitta',
      title: 'Il microfono davanti alla bocca',
      text: `Un'altra sconfitta. Nel corridoio del ${context.clubName} ti mettono un microfono davanti mentre sei ancora arrabbiato.`,
      options: [
        {
          id: 'difendi',
          label: 'Difendi il gruppo',
          stake: 'Nessun titolo sui giornali, ma lo spogliatoio se lo ricorda.',
          outcomes: [
            { chance: 1, text: 'Ti prendi tu la responsabilità. Dentro se ne accorgono.', effects: { addMark: { id: 'uomo-spogliatoio', intensity: 0.5 } } },
          ],
        },
        {
          id: 'attacca',
          label: 'Dì quello che pensi davvero',
          stake: 'I tifosi ti amano, il mister molto meno.',
          outcomes: [
            { chance: 0.5, text: 'La curva ti applaude: finalmente qualcuno che parla chiaro.', effects: { addMark: { id: 'beniamino-dei-tifosi', intensity: 0.6 }, minutesDelta: -0.05 } },
            { chance: 0.5, text: "L'allenatore la prende sul personale. Ti costa il posto.", effects: { addMark: { id: 'rissa-col-mister', intensity: 0.6 }, minutesDelta: -0.15 } },
          ],
        },
        {
          id: 'niente',
          label: 'Nessun commento',
          stake: 'Non succede niente, nel bene e nel male.',
          outcomes: [{ chance: 1, text: 'Passi oltre senza parlare.', effects: {} }],
        },
      ],
    }),
  },
  {
    id: 'pace-col-mister',
    weight: 3,
    when: (context) => markIntensity(context.marks, 'rissa-col-mister') > 0.3,
    build: (context) => ({
      id: 'pace-col-mister',
      title: 'Quella frase pesa ancora',
      text: `Da quando hai alzato la voce non sei più lo stesso agli occhi della panchina. Al ${context.clubName} qualcuno prova a ricucire.`,
      options: [
        {
          id: 'scusati',
          label: 'Fai il primo passo',
          stake: "Ti costa l'orgoglio, ma cancella il passato.",
          outcomes: [
            { chance: 0.7, text: 'Vi chiarite davanti a tutti. Il caso è chiuso.', effects: { removeMark: 'rissa-col-mister', minutesDelta: 0.1 } },
            { chance: 0.3, text: 'Ti ascolta, annuisce, e non cambia niente.', effects: {} },
          ],
        },
        {
          id: 'tieni-il-punto',
          label: 'Non hai niente di cui scusarti',
          stake: 'Resti te stesso, ma il muro resta in piedi.',
          outcomes: [
            { chance: 1, text: 'Nessuno fa il primo passo. Si va avanti così.', effects: { addMark: { id: 'carattere-fragile', intensity: 0.3 } } },
          ],
        },
      ],
    }),
  },
  {
    id: 'fascia-di-capitano',
    weight: 2,
    when: (context) => context.age >= 27 && context.minutesShare >= 0.6,
    build: (context) => ({
      id: 'fascia-di-capitano',
      title: 'La fascia',
      text: `Il capitano del ${context.clubName} ha chiuso. In sala video ti chiedono se te la senti di prendere la fascia.`,
      options: [
        {
          id: 'accetta',
          label: 'Prendi la fascia',
          stake: 'Più peso sulle spalle, più peso nello spogliatoio.',
          outcomes: [
            { chance: 0.75, text: 'Il gruppo ti segue. Sei tu che parli, adesso.', effects: { addMark: { id: 'leader-riconosciuto', intensity: 0.8 }, minutesDelta: 0.05 } },
            { chance: 0.25, text: 'La responsabilità ti pesa addosso più di quanto pensassi.', effects: { addMark: { id: 'carattere-fragile', intensity: 0.5 } } },
          ],
        },
        {
          id: 'rifiuta',
          label: 'Lascia perdere',
          stake: 'Niente pressione, ma qualcuno se lo segna.',
          outcomes: [{ chance: 1, text: 'Preferisci pensare a giocare. Legittimo.', effects: {} }],
        },
      ],
    }),
  },
  {
    id: 'il-ragazzino',
    weight: 2,
    when: (context) => context.age >= 29 && context.minutesShare >= 0.4,
    build: (context) => ({
      id: 'il-ragazzino',
      title: 'Il ragazzino del vivaio',
      text: `Al ${context.clubName} è salito un diciottenne che nel tuo ruolo fa cose che tu a quell'età non facevi. Il posto è uno.`,
      options: [
        {
          id: 'aiutalo',
          label: 'Prendilo sotto braccio',
          stake: 'Ti toglie minuti, ti dà una reputazione.',
          outcomes: [
            { chance: 1, text: 'Gli insegni il mestiere. In società lo notano.', effects: { addMark: { id: 'leader-riconosciuto', intensity: 0.6 }, minutesDelta: -0.08 } },
          ],
        },
        {
          id: 'ignoralo',
          label: 'Fatti trovare pronto e basta',
          stake: 'Difendi il posto, ma lo spogliatoio ti guarda.',
          outcomes: [
            { chance: 0.6, text: 'Il campo dice che il titolare sei ancora tu.', effects: { minutesDelta: 0.06 } },
            { chance: 0.4, text: 'Il ragazzino gioca lo stesso, e tu passi per quello scomodo.', effects: { minutesDelta: -0.1, addMark: { id: 'carattere-fragile', intensity: 0.4 } } },
          ],
        },
      ],
    }),
  },
  {
    id: 'ritorno-a-casa',
    weight: 2,
    when: (context) => context.age >= 31 && context.leagueLevel <= 2,
    build: (context) => ({
      id: 'ritorno-a-casa',
      title: 'La squadra di quando eri bambino',
      text: `Ti cerca la squadra della tua città. Categoria più bassa, stipendio più basso, ma è casa. Al ${context.clubName} ti terrebbero ancora un anno.`,
      options: [
        {
          id: 'torna',
          label: 'Torna a casa',
          stake: 'Chiudi la carriera dove è cominciata, ma rinunci al palcoscenico.',
          outcomes: [
            { chance: 1, text: 'Firmi dove hai imparato a giocare. Lo stadio si alza in piedi.', effects: { addMark: { id: 'tornato-a-casa', intensity: 1 }, minutesDelta: 0.15, valueMultiplier: 0.8 } },
          ],
        },
        {
          id: 'resta',
          label: 'Resta dove sei',
          stake: 'Ancora un anno ad alto livello, finché il fisico regge.',
          outcomes: [{ chance: 1, text: 'Non è ancora il momento dei saluti.', effects: {} }],
        },
      ],
    }),
  },
];
