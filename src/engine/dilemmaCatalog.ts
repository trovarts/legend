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
  /**
   * Un bivio urgente non aspetta il sorteggio: se le condizioni ci sono, si presenta.
   * Un ginocchio rotto non è un evento fra tanti, è *la* cosa di quella stagione.
   */
  urgent?: boolean;
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
    urgent: true,
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
    id: 'sala-operatoria',
    weight: 3,
    urgent: true,
    when: (context) => context.injury !== null && context.injury.severity === 'grave',
    build: (context) => ({
      id: 'sala-operatoria',
      title: 'Sala operatoria',
      text: `${context.clubName}. Un intervento elettivo può sistemare la cosa una volta per tutte, ma vuol dire mesi di stampelle.`,
      options: [
        {
          id: 'operati',
          label: 'Operazione elettiva',
          stake: 'Mesi fuori adesso, ma il problema sparisce.',
          outcomes: [
            { chance: 0.7, text: 'Il ginocchio torna nuovo. Il chirurgo ha fatto un lavoro pulito.', effects: { removeMark: 'ginocchio-fragile', minutesDelta: -0.2 } },
            { chance: 0.3, text: 'L\'operazione riesce a metà: giochi, ma con la testa altrove.', effects: { minutesDelta: -0.15, overall: -1 } },
          ],
        },
        {
          id: 'continua-cosi',
          label: 'Continua così',
          stake: 'Stringi i denti e giochi, finché regge.',
          outcomes: [
            { chance: 0.55, text: 'Con le infiltrazioni si va avanti. Per quest\'anno tiene.', effects: { minutesDelta: 0.05 } },
            { chance: 0.45, text: 'Cede di nuovo, e stavolta è peggio.', effects: { addMark: { id: 'ginocchio-fragile', intensity: 0.9 }, overall: -2, retirementDelta: -2 } },
          ],
        },
      ],
    }),
  },
  {
    id: 'lavoro-mentale',
    weight: 2,
    when: (context) => markIntensity(context.marks, 'carattere-fragile') > 0.25,
    build: () => ({
      id: 'lavoro-mentale',
      title: 'Lavoro mentale',
      text: 'Qualcuno ti ha fatto notare che nei momenti che contano ti irrigidisci. La società propone un percorso con un preparatore mentale.',
      options: [
        {
          id: 'mental-coach',
          label: 'Mental coach',
          stake: 'Ci lavori sopra: serve tempo, ma qualcosa cambia.',
          outcomes: [
            { chance: 0.7, text: 'Impari a stare nel momento. La testa non trema più.', effects: { removeMark: 'carattere-fragile', minutesDelta: 0.06 } },
            { chance: 0.3, text: 'Sedute educate, nessun cambiamento vero.', effects: {} },
          ],
        },
        {
          id: 'da-solo',
          label: 'Te la gestisci da solo',
          stake: 'Nessuno che ti dice cosa pensare, nel bene e nel male.',
          outcomes: [
            { chance: 0.5, text: 'Ci arrivi da solo, e vale di più.', effects: { removeMark: 'carattere-fragile', addMark: { id: 'leader-riconosciuto', intensity: 0.4 } } },
            { chance: 0.5, text: 'Continui a ingoiare tutto. Prima o poi si vede.', effects: { minutesDelta: -0.05 } },
          ],
        },
      ],
    }),
  },
  {
    id: 'intervista-fine-stagione',
    weight: 2,
    when: (context) => context.season >= 2 && context.minutesShare >= 0.4,
    build: (context) => ({
      id: 'intervista-fine-stagione',
      title: 'Intervista di fine stagione',
      text: `${context.clubName}. I microfoni vogliono il tuo bilancio dell'annata: quello che dici finisce sui giornali di domani.`,
      options: [
        {
          id: 'umilta',
          label: 'Umiltà nei media',
          stake: 'Nessun titolo, ma neanche nemici.',
          outcomes: [
            { chance: 1, text: 'Ringrazi compagni e staff. Nessuno si offende.', effects: { addMark: { id: 'uomo-spogliatoio', intensity: 0.4 } } },
          ],
        },
        {
          id: 'dichiarazioni-di-fuoco',
          label: 'Dichiarazioni di fuoco',
          stake: 'La piazza si infiamma, la società meno.',
          outcomes: [
            { chance: 0.5, text: 'Hai detto quello che pensavano tutti. La curva ti porta in trionfo.', effects: { addMark: { id: 'beniamino-dei-tifosi', intensity: 0.8 } } },
            { chance: 0.5, text: 'In società non l\'hanno presa bene. Il mercato lo faranno senza chiederti niente.', effects: { addMark: { id: 'promessa-tradita', intensity: 0.5 }, minutesDelta: -0.08 } },
          ],
        },
      ],
    }),
  },
  {
    id: 'lingua-e-cultura',
    weight: 2,
    when: (context) => context.season >= 3 && context.contractYearsLeft >= 2,
    build: (context) => ({
      id: 'lingua-e-cultura',
      title: 'Un paese nuovo',
      text: `${context.clubName}. Fuori dal campo non capisci metà di quello che dicono, e nello spogliatoio si ride di battute che non afferri.`,
      options: [
        {
          id: 'studia',
          label: 'Lingua e cultura',
          stake: "Ore sui libri dopo l'allenamento, ma entri nel gruppo.",
          outcomes: [
            { chance: 0.75, text: 'In tre mesi parli con tutti. Cambia tutto, anche in campo.', effects: { addMark: { id: 'uomo-spogliatoio', intensity: 0.6 }, minutesDelta: 0.08 } },
            { chance: 0.25, text: 'Fatichi più del previsto: la testa resta altrove.', effects: { minutesDelta: -0.04 } },
          ],
        },
        {
          id: 'solo-campo',
          label: 'Parla solo il campo',
          stake: 'Ti isoli, ma non perdi un minuto di allenamento.',
          outcomes: [
            { chance: 1, text: 'Fai il tuo e torni a casa. Funziona, per un po\'.', effects: { addMark: { id: 'carattere-fragile', intensity: 0.3 } } },
          ],
        },
      ],
    }),
  },
  {
    id: 'ritorno-a-casa',
    weight: 2,
    // Con le carriere che finiscono verso i trentaquattro, a trentuno non restava
    // abbastanza tempo perché tornare a casa potesse ripagare: era una scelta finta.
    when: (context) => context.age >= 29 && context.leagueLevel <= 2,
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
            { chance: 1, text: 'Firmi dove hai imparato a giocare. Lo stadio si alza in piedi.', effects: { addMark: { id: 'tornato-a-casa', intensity: 1 }, minutesDelta: 0.24, overall: -1, valueMultiplier: 0.75 } },
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
  {
    id: 'la-fascia-pesa',
    weight: 2,
    when: (context) =>
      context.marks.some((segno) => segno.id === 'leader-riconosciuto') &&
      context.minutesShare < 0.55 &&
      context.season >= 5,
    build: (context) => ({
      id: 'la-fascia-pesa',
      title: 'Il capitano che non gioca',
      text: `Sei il capitano di ${context.clubName}, ma il mister ti tiene fuori. Lo spogliatoio guarda te per capire come si reagisce.`,
      options: [
        {
          id: 'tieni-il-gruppo',
          label: 'Tieni insieme il gruppo',
          stake: 'Il tuo peso cresce, il tuo posto no.',
          outcomes: [
            { chance: 1, text: 'Non alzi la voce e non molli nessuno. Lo spogliatoio se ne accorge.', effects: { addMark: { id: 'uomo-spogliatoio', intensity: 2 }, minutesDelta: -0.03 } },
          ],
        },
        {
          id: 'restituisci-la-fascia',
          label: 'Restituisci la fascia',
          stake: 'Torni un giocatore fra gli altri, e giochi per il posto.',
          outcomes: [
            { chance: 0.6, text: 'Senza il peso della fascia torni a spingere: il mister ti rivede.', effects: { minutesDelta: 0.12 } },
            { chance: 0.4, text: 'Il gesto suona come una resa. La societa prende nota.', effects: { minutesDelta: 0.04, addMark: { id: 'carattere-fragile', intensity: 1 } } },
          ],
        },
      ],
    }),
  },
  {
    id: 'la-piazza-contesta',
    weight: 2,
    when: (context) => context.season >= 3 && context.minutesShare > 0.5 && !context.wonSomething,
    build: (context) => ({
      id: 'la-piazza-contesta',
      title: 'Fischi sotto la curva',
      text: `Terza sconfitta di fila. A fine partita la curva di ${context.clubName} chiama la squadra sotto il settore. Qualcuno resta negli spogliatoi.`,
      options: [
        {
          id: 'vai-sotto-la-curva',
          label: 'Vai sotto la curva',
          stake: 'Ti prendi i fischi in faccia, davanti a tutti.',
          outcomes: [
            { chance: 0.7, text: 'Prendi i fischi senza abbassare la testa. Alla piazza resta impresso.', effects: { addMark: { id: 'beniamino-dei-tifosi', intensity: 2 } } },
            { chance: 0.3, text: 'Qualcuno alza il tono, la cosa degenera. Ci vorra tempo.', effects: { minutesDelta: -0.05 } },
          ],
        },
        {
          id: 'resta-dentro',
          label: 'Resta negli spogliatoi',
          stake: 'Eviti il momento, ma quel momento si ricorda.',
          outcomes: [
            { chance: 1, text: 'Entri senza voltarti. La curva lo scrive su uno striscione.', effects: { addMark: { id: 'promessa-tradita', intensity: 1 } } },
          ],
        },
      ],
    }),
  },
  {
    id: 'il-procuratore-ombra',
    weight: 2,
    when: (context) => context.season >= 4 && context.overall >= 68 && context.contractYearsLeft <= 2,
    build: () => ({
      id: 'il-procuratore-ombra',
      title: 'Un altro procuratore ti cerca',
      text: "Ti contatta un intermediario che non e il tuo: promette un contratto altrove e una commissione che non passa dal tuo agente. Basta non dirlo a nessuno.",
      options: [
        {
          id: 'ascolti-in-silenzio',
          label: 'Lo ascolti in silenzio',
          stake: 'Piu offerte, ma se si sa che tratti alle spalle di tutti...',
          outcomes: [
            { chance: 0.55, text: 'Il giro si allarga e le porte si aprono. Nessuno lo viene a sapere.', effects: { minutesDelta: 0.05, valueMultiplier: 1.2 } },
            { chance: 0.45, text: 'La voce gira prima di te. Il club lo scopre, e il rapporto si incrina.', effects: { addMark: { id: 'mercenario', intensity: 2 }, minutesDelta: -0.08 } },
          ],
        },
        {
          id: 'lo-mandi-via',
          label: 'Lo mandi via',
          stake: 'Niente scorciatoie, niente rischi.',
          outcomes: [
            { chance: 1, text: 'Chiudi la porta e lo dici al tuo agente. Il rapporto ne esce solido.', effects: { addMark: { id: 'uomo-spogliatoio', intensity: 1 } } },
          ],
        },
      ],
    }),
  },
  {
    id: 'la-notte-prima',
    weight: 2,
    when: (context) => context.season >= 2 && context.age <= 26 && context.minutesShare > 0.4,
    build: () => ({
      id: 'la-notte-prima',
      title: 'La sera prima della partita',
      text: 'Vecchi amici in citta, il ritrovo e stasera. Domani si gioca, e domani il mister guarda proprio te.',
      options: [
        {
          id: 'esci',
          label: 'Esci lo stesso',
          stake: 'Una serata come una volta. E domani si vedra.',
          outcomes: [
            { chance: 0.45, text: 'Torni presto, dormi bene e domani giochi leggero: certe cose ti tengono in equilibrio.', effects: { minutesDelta: 0.04 } },
            { chance: 0.55, text: 'Rientri tardi. Domani le gambe non girano, e si vede da fuori.', effects: { minutesDelta: -0.09, overall: -1 } },
          ],
        },
        {
          id: 'resti-a-casa',
          label: 'Resti a casa',
          stake: 'Niente di male e niente di buono: si dorme.',
          outcomes: [
            { chance: 1, text: 'Mandi un messaggio e vai a letto presto. Domani sei quello di sempre.', effects: {} },
          ],
        },
      ],
    }),
  },
  {
    id: 'il-posto-del-giovane',
    weight: 2,
    when: (context) => context.age >= 29 && context.minutesShare > 0.55,
    build: (context) => ({
      id: 'il-posto-del-giovane',
      title: 'Il ragazzo che gioca al tuo posto',
      text: `A ${context.clubName} e arrivato un ragazzo del vivaio nel tuo ruolo. Il mister chiede a te cosa farne.`,
      options: [
        {
          id: 'fagli-spazio',
          label: 'Digli di farlo giocare',
          stake: 'Meno minuti per te, e un debito che qualcuno si ricorda.',
          outcomes: [
            { chance: 1, text: 'Lo dici davanti a tutti. Il club se lo segna, il ragazzo pure.', effects: { minutesDelta: -0.12, addMark: { id: 'uomo-spogliatoio', intensity: 2 }, retirementDelta: 1 } },
          ],
        },
        {
          id: 'il-posto-e-mio',
          label: 'Il posto e tuo, e lo difendi',
          stake: 'Giochi, ma con qualcuno che ti fiata sul collo.',
          outcomes: [
            { chance: 0.6, text: 'Rispondi sul campo e non lasci un metro. Il posto resta tuo.', effects: { minutesDelta: 0.06 } },
            { chance: 0.4, text: "Ti irrigidisci, e a quell'eta si paga: il ragazzo passa avanti lo stesso.", effects: { minutesDelta: -0.14 } },
          ],
        },
      ],
    }),
  },
  {
    id: 'il-rigore-decisivo',
    weight: 2,
    when: (context) => context.minutesShare > 0.6 && context.season >= 3,
    build: (context) => ({
      id: 'il-rigore-decisivo',
      title: 'Chi lo tira',
      text: `Novantesimo, rigore per ${context.clubName}. Il rigorista designato non c'e. Il pallone e li, e nessuno si fa avanti.`,
      options: [
        {
          id: 'lo-prendi-tu',
          label: 'Prendi il pallone',
          stake: 'Se entra sei tu. Se esce, sei tu lo stesso.',
          outcomes: [
            { chance: 0.72, text: 'Lo metti dove il portiere non arriva. Da li in poi i rigori li tiri tu.', effects: { addMark: { id: 'leader-riconosciuto', intensity: 2 }, minutesDelta: 0.05 } },
            { chance: 0.28, text: 'Traversa. Il silenzio dello stadio te lo porti dietro per mesi.', effects: { addMark: { id: 'carattere-fragile', intensity: 2 }, minutesDelta: -0.06 } },
          ],
        },
        {
          id: 'lo-lasci',
          label: 'Lo lasci a un altro',
          stake: 'Nessun rischio, e nessuno che ti guardi.',
          outcomes: [
            { chance: 1, text: 'Fai un passo indietro. Lo tira un compagno, e nessuno ti chiede niente.', effects: {} },
          ],
        },
      ],
    }),
  },
  {
    id: 'la-clausola',
    weight: 2,
    when: (context) => context.contractYearsLeft >= 2 && context.overall >= 72 && context.season >= 5,
    build: (context) => ({
      id: 'la-clausola',
      title: 'La clausola nel contratto',
      text: `${context.clubName} ti offre il rinnovo. C'e una clausola di uscita bassa: ti libera fra due anni, ma ti mette in vetrina per chiunque.`,
      options: [
        {
          id: 'firmi-con-la-clausola',
          label: 'Firmi con la clausola',
          stake: 'Ti apre le porte, e ti toglie il potere di dire no.',
          outcomes: [
            { chance: 1, text: 'Firmi. Da domani il tuo nome circola in ogni lista — e il club lo sa.', effects: { valueMultiplier: 1.12, addMark: { id: 'mercenario', intensity: 2 } } },
          ],
        },
        {
          id: 'la-fai-togliere',
          label: 'Chiedi di toglierla',
          stake: 'Resti padrone del tuo destino, ma il club chiede qualcosa in cambio.',
          outcomes: [
            { chance: 0.7, text: 'Il club accetta: niente clausola, piu spazio e un anno in piu di fiducia.', effects: { retirementDelta: 2, minutesDelta: 0.08, addMark: { id: 'bandiera', intensity: 2 } } },
            { chance: 0.3, text: 'Il club si irrigidisce e rimanda tutto. Il rinnovo resta in sospeso.', effects: { minutesDelta: -0.05 } },
          ],
        },
      ],
    }),
  },
];
