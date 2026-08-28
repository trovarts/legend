# LEGGENDA

Un simulatore di carriera calcistica che si gioca nel browser. Si comincia a
quattordici anni nel vivaio di una squadra vera, in una divisione vera, e si arriva
dove si arriva.

**Nessun account, nessuna installazione, nessun server.** È un sito statico: il mondo
si scarica un campionato per volta, e la partita gira tutta nel browser.

## Com'è fatto

**Il salvataggio è un seme e una lista di scelte.** Non c'è stato di gioco da nessuna
parte: a ogni schermata la carriera viene rigiocata da capo dal seme e si ferma alla
prima decisione mancante. Costa meno di un millisecondo, e in cambio dà salvataggi che
stanno in un messaggio, carriere che si possono condividere per intero, e nessuno stato
che si possa corrompere.

**Il motore non sa che esiste un'interfaccia.** In `src/engine/` non ci sono né
`Math.random()` né `Date.now()`: ogni casualità passa da un generatore con un seme. È
quello che rende la stessa carriera identica ovunque la si riapra.

**Il mondo è sostituibile.** `WorldSource` è un'interfaccia con due implementazioni —
da filesystem per i test, da rete per il browser. Il gioco non sa da dove arrivino i
club.

## I guardiani

I test dicono che il codice fa quello che dice. Non dicono se il gioco è bello. Per
quello ci sono tre laboratori che simulano carriere vere e si fermano se qualcosa non
regge:

| Comando | Cosa sorveglia |
| --- | --- |
| `npm test` | 400 test sul motore e sull'interfaccia |
| `npm run lab` | 2000 carriere: crescita, trofei, minuti, età al ritiro, promozioni, obiettivi |
| `npm run lab:choices` | che nessuna scelta ai bivi sia sempre quella giusta |
| `npm run lab:vivaio` | che anche partendo dalla quarta serie la carriera stia in piedi |
| `npm run racconto` | stampa una carriera intera, da leggere |
| `npm run check:bundle` | il peso della prima pagina |
| `npm run check:static` | che il sito costruito si apra davvero |

`npm run verify` li esegue tutti.

## Per lavorarci

```bash
npm install
npm run import:world   # costruisce i dati del mondo da data/raw
npm run dev
```

Le decisioni di progetto, con il perché e cosa si è rotto ogni volta, stanno in
[docs/decisions.md](docs/decisions.md).

## Da dove vengono i dati

Club e calciatori arrivano da un dataset pubblico di EA FC 26 (`data/raw`). Terza e
quarta divisione, che il dataset non copre, sono generate: città vere del paese,
soprannomi cromatici, e rose di comprimari con nomi presi dai calciatori veri di quel
paese, divisi per ruolo.
