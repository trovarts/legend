import { markIntensity } from './marks';
import type { Dilemma, Injury, Mark } from './types';

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
  /** Bivi già affrontati di recente: non si ripropongono (vedi D-012). */
  recentDilemmaIds: readonly string[];
  /** Com'è andata la stagione fin qui. Lo usa l'interfaccia, non il catalogo. */
  soFar?: {
    clubName: string;
    leagueName: string;
    position: number;
    stats: import('./types').SeasonStats;
    injury: Injury | null;
    minutesShare: number;
  };
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
      text: `${context.clubName}. Il medico parla di ${context.injury?.matchesOut ?? 10} partite. L'agente ricorda che una stagione in bianco, a ${context.age} anni, la gente la nota.`,
      options: [
        {
          id: 'aspetta',
          label: 'Aspetta di guarire davvero',
          stake: 'Perdi mezza stagione, ma torni intero.',
          outcomes: [
            { chance: 1, text: 'Rientri quando il ginocchio è a posto. Nessuno strascico, ma la stagione è andata.', effects: { minutesDelta: -0.14 } },
          ],
        },
        {
          id: 'anticipa',
          label: 'Rientra un mese prima',
          stake: '70% torni come prima, 30% te lo porti dietro per sempre.',
          outcomes: [
            { chance: 0.7, text: 'Il rientro regge, e la squadra ti ritrova nel momento decisivo.', effects: { minutesDelta: 0.16, addMark: { id: 'beniamino-dei-tifosi', intensity: 0.4 } } },
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
      text: `${context.clubName}. Sono mesi che entri solo nei finali: il mister non ti guarda nemmeno più durante il riscaldamento.`,
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
            { chance: 1, text: `Chiedi di andare via. ${context.clubName} ti mette sul mercato.`, effects: { addMark: { id: 'mercenario', intensity: 0.5 }, minutesDelta: 0.05 } },
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
      text: `${context.clubName} mette sul tavolo il rinnovo. Il tuo agente dice che aspettando la scadenza guadagneresti il doppio altrove.`,
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
            { chance: 0.6, text: 'Arrivi a scadenza con le offerte in mano: ingaggio doppio e maglia da titolare.', effects: { valueMultiplier: 1.35, minutesDelta: 0.1, addMark: { id: 'mercenario', intensity: 0.4 } } },
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
      text: `${context.clubName}. Un'altra sconfitta, e nel corridoio ti mettono un microfono davanti mentre sei ancora arrabbiato.`,
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
      text: `${context.clubName}. Da quando hai alzato la voce non sei più lo stesso agli occhi della panchina, e qualcuno prova a ricucire.`,
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
          stake: 'Se hai ragione tu, ne esci più forte. Se no, resti fuori.',
          outcomes: [
            { chance: 0.55, text: 'A marzo esonerano lui. Lo spogliatoio si ricorda chi non si è piegato.', effects: { removeMark: 'rissa-col-mister', addMark: { id: 'leader-riconosciuto', intensity: 0.6 }, minutesDelta: 0.12 } },
            { chance: 0.45, text: 'Nessuno fa il primo passo. Si va avanti così.', effects: { addMark: { id: 'carattere-fragile', intensity: 0.3 }, minutesDelta: -0.05 } },
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
      text: `${context.clubName}. Il capitano ha chiuso, e in sala video ti chiedono se te la senti di prendere la fascia.`,
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
          outcomes: [
            { chance: 1, text: 'Preferisci pensare solo a giocare. Senza quel peso rendi meglio.', effects: { minutesDelta: 0.06 } },
          ],
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
      text: `${context.clubName}. Dal vivaio è salito un diciottenne che nel tuo ruolo fa cose che tu a quell'età non facevi. Il posto è uno.`,
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
            { chance: 0.6, text: 'Il campo dice che il titolare sei ancora tu, e per un altro anno nessuno discute.', effects: { minutesDelta: 0.12 } },
            { chance: 0.4, text: 'Il ragazzino gioca lo stesso, e tu passi per quello scomodo.', effects: { minutesDelta: -0.1, addMark: { id: 'carattere-fragile', intensity: 0.4 } } },
          ],
        },
      ],
    }),
  },
  {
    id: 'ritiro-nuova-squadra',
    weight: 3,
    when: (context) => context.season >= 2 && context.contractYearsLeft >= 3,
    build: (context) => ({
      id: 'ritiro-nuova-squadra',
      title: 'Primo giorno di ritiro',
      text: `${context.clubName}. Spogliatoio nuovo, facce nuove: come ti presenti a chi dovrà passarti la palla.`,
      options: [
        {
          id: 'primo-ad-arrivare',
          label: 'Primo ad arrivare, ultimo ad andare via',
          stake: "Lo staff se ne accorge, le gambe un po' meno.",
          outcomes: [
            { chance: 0.65, text: 'Il preparatore ti indica come esempio al gruppo.', effects: { minutesDelta: 0.09, addMark: { id: 'uomo-spogliatoio', intensity: 0.5 } } },
            { chance: 0.35, text: 'Arrivi alla prima giornata già cotto.', effects: { minutesDelta: -0.05 } },
          ],
        },
        {
          id: 'testa-al-campo',
          label: 'Parla solo il campo',
          stake: 'Nessun rischio: ti giudicheranno la domenica.',
          outcomes: [
            { chance: 1, text: 'Fai il tuo lavoro senza dare confidenza a nessuno.', effects: {} },
          ],
        },
        {
          id: 'lega-con-lo-spogliatoio',
          label: 'Cerchi subito il gruppo',
          stake: 'Ti apri, e qualcuno se ne approfitta.',
          outcomes: [
            { chance: 0.6, text: 'In due settimane sembra che tu sia lì da anni.', effects: { addMark: { id: 'uomo-spogliatoio', intensity: 0.6 }, minutesDelta: 0.05 } },
            { chance: 0.4, text: 'Finisci nel gruppetto sbagliato, e il mister lo nota.', effects: { minutesDelta: -0.08, addMark: { id: 'carattere-fragile', intensity: 0.3 } } },
          ],
        },
      ],
    }),
  },
  {
    id: 'messaggio-alla-piazza',
    weight: 2,
    when: (context) => context.contractYearsLeft <= 1 && context.minutesShare >= 0.4,
    build: (context) => ({
      id: 'messaggio-alla-piazza',
      title: 'La piazza vuole sapere',
      text: `${context.clubName}. Il contratto è agli sgoccioli e sotto casa qualcuno ti ha già chiesto se resti.`,
      options: [
        {
          id: 'giuro-fedelta',
          label: 'Dici che non te ne vai',
          stake: 'La curva ti adotta. Se poi parti, non te lo perdonano.',
          outcomes: [
            { chance: 0.55, text: 'Lo stadio canta il tuo nome per un mese.', effects: { addMark: { id: 'beniamino-dei-tifosi', intensity: 0.7 }, minutesDelta: 0.06 } },
            { chance: 0.45, text: 'A giugno le cose cambiano, e la frase ti resta appiccicata.', effects: { addMark: { id: 'promessa-tradita', intensity: 0.5 } } },
          ],
        },
        {
          id: 'niente-promesse',
          label: 'Non prometti niente',
          stake: 'Nessuno esulta, nessuno ti accusa.',
          outcomes: [
            { chance: 1, text: 'Rispondi che pensi solo alla partita di domenica.', effects: {} },
          ],
        },
      ],
    }),
  },
  {
    id: 'chiamata-dall-estero',
    weight: 2,
    when: (context) => context.age >= 21 && context.age <= 30 && context.minutesShare >= 0.5,
    build: (context) => ({
      id: 'chiamata-dall-estero',
      title: 'Una telefonata da fuori',
      text: `Il tuo agente ha una pista all'estero: campionato diverso, lingua diversa, tutto da rifare. A ${context.clubName} nessuno sa niente.`,
      options: [
        {
          id: 'ascolta',
          label: 'Digli di andare avanti',
          stake: 'Può valere il salto della vita, o un anno buttato.',
          outcomes: [
            { chance: 0.5, text: 'La trattativa scalda il tuo nome: il valore sale.', effects: { valueMultiplier: 1.25, minutesDelta: 0.04 } },
            { chance: 0.5, text: 'Si sparge la voce che vuoi andartene. Qui la prendono male.', effects: { addMark: { id: 'mercenario', intensity: 0.45 }, minutesDelta: -0.06 } },
          ],
        },
        {
          id: 'chiudi',
          label: 'Chiudi la porta',
          stake: 'Resti concentrato su quello che hai.',
          outcomes: [
            { chance: 1, text: 'Fai sapere che non è aria. Il gruppo apprezza.', effects: { addMark: { id: 'uomo-spogliatoio', intensity: 0.35 } } },
          ],
        },
      ],
    }),
  },
  {
    id: 'sponsor',
    weight: 2,
    when: (context) => context.overall >= 72 && context.minutesShare >= 0.55,
    build: () => ({
      id: 'sponsor',
      title: 'Ti vogliono in televisione',
      text: 'Un marchio importante ti offre una campagna. Servizio fotografico, riprese, due settimane fuori dal campo di allenamento.',
      options: [
        {
          id: 'firma',
          label: 'Firmi il contratto',
          stake: 'Soldi e visibilità, ma il mister storce la bocca.',
          outcomes: [
            { chance: 0.6, text: 'Il tuo volto è ovunque, e il valore di mercato ne beneficia.', effects: { valueMultiplier: 1.2, minutesDelta: -0.04 } },
            { chance: 0.4, text: 'Ti presenti stanco agli allenamenti, e si vede.', effects: { minutesDelta: -0.1, overall: -1 } },
          ],
        },
        {
          id: 'rifiuti',
          label: 'Rimandi a fine stagione',
          stake: 'Niente soldi extra, testa libera.',
          outcomes: [
            { chance: 1, text: 'Dici che se ne riparla a giugno. Il mister ti guarda diversamente.', effects: { minutesDelta: 0.05 } },
          ],
        },
      ],
    }),
  },
  {
    id: 'compagno-in-difficolta',
    weight: 2,
    when: (context) => context.season >= 3 && context.minutesShare >= 0.45,
    build: (context) => ({
      id: 'compagno-in-difficolta',
      title: 'Il compagno che non gioca più',
      text: `${context.clubName}. Uno del gruppo è fuori rosa da mesi e nello spogliatoio si è formato un muro attorno a lui.`,
      options: [
        {
          id: 'stai-con-lui',
          label: 'Ti schieri con lui',
          stake: 'Il gruppo ti rispetta, la società molto meno.',
          outcomes: [
            { chance: 0.55, text: 'Il tuo peso nello spogliatoio cresce di colpo.', effects: { addMark: { id: 'leader-riconosciuto', intensity: 0.7 } } },
            { chance: 0.45, text: 'In società ti mettono nella lista di quelli scomodi.', effects: { minutesDelta: -0.09 } },
          ],
        },
        {
          id: 'non-ti-immischi',
          label: 'Non sono affari tuoi',
          stake: 'Nessuna conseguenza, nessun credito.',
          outcomes: [
            { chance: 1, text: 'Giri la testa dall\'altra parte e vai avanti.', effects: {} },
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
      text: `Ti cerca la squadra della tua città. Categoria più bassa, stipendio più basso, ma è casa. ${context.clubName} ti terrebbe ancora un anno.`,
      options: [
        {
          id: 'torna',
          label: 'Torna a casa',
          stake: 'Giochi molto di più, ma in una categoria che ti arrugginisce.',
          outcomes: [
            { chance: 1, text: 'Firmi dove hai imparato a giocare. Lo stadio si alza in piedi.', effects: { addMark: { id: 'tornato-a-casa', intensity: 1 }, minutesDelta: 0.18, overall: -2, valueMultiplier: 0.6 } },
          ],
        },
        {
          id: 'resta',
          label: 'Resta dove sei',
          stake: 'Resti dove si gioca sul serio, e continui a migliorare.',
          outcomes: [{ chance: 1, text: 'Non è ancora il momento dei saluti.', effects: {} }],
        },
      ],
    }),
  },
];
