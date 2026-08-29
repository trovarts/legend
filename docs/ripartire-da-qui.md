# Ripartire da qui

Questo file esiste per una cosa sola: far ricominciare il lavoro da una conversazione
nuova senza perdere niente. Leggi questo, poi `docs/decisions.md`.

## Cos'è

**LEGGENDA** — simulatore di carriera calcistica nel browser, in
`~/Documents/💻 Progetti e codice/leggenda`. Nato per battere `ilnuovogoat.it`, che
è il riferimento dichiarato: stesso ciclo di gioco, esecuzione migliore.

- **Online:** <https://trovarts.github.io/legend/>
- **Repository:** `trovarts/legend` (pubblico). Ogni push su `main` ricostruisce il
  mondo dal CSV, esegue test e laboratori, e ripubblica.
- **La cartella locale si chiama `leggenda`, il repository `legend`.** Non è un errore.

## Stato al 29/08/2026

406 test verdi, tutti i laboratori puliti, 226 KB di prima pagina contro i 1199 KB del
riferimento. 57 campionati veri in 28 nazioni, 1015 club, 25 bivi.

**Il gioco è completo sul single-player.** Sono fuori scope per scelta del committente:
online, classifiche globali, account, altre lingue.

## Come si lavora qui

```bash
npm install
npm run import:world   # ricostruisce public/world dal CSV in data/raw (non è in cronologia)
npm run dev
npm run verify         # typecheck, test, build, peso, sito statico, tre laboratori
```

I guardiani contano più dei test:

| Comando | Cosa sorveglia |
| --- | --- |
| `npm run lab` | 2000 carriere: crescita, trofei, minuti, età al ritiro, promozioni, obiettivi |
| `npm run lab:choices` | che nessuna scelta ai bivi sia sempre quella giusta |
| `npm run lab:vivaio` | che anche partendo dalla quarta serie la carriera stia in piedi |
| `npm run racconto 7 FWD 4` | stampa una carriera intera **da leggere**: è così che sono usciti i difetti peggiori |
| `npm run codice-finito` | il codice di una carriera già conclusa, per provare le schermate finali senza giocare vent'anni |

## Le tre regole che questo progetto ha imparato a sue spese

1. **Testare sulle rose vere, non su dati inventati** (D-005).
2. **Un modello statisticamente corretto può essere sbagliato per il gioco** (D-007).
3. **Verificare lo strumento di verifica prima di credergli** (D-011): rompi apposta la
   cosa che il controllo dovrebbe vedere, e guarda se fallisce.

E due che sono arrivate dopo:

4. **Leggere una carriera intera, non guardarne la media** (D-024): il Lab sorveglia il
   modello, non l'esperienza.
5. **Una schermata che chiede di scorrere per trovare l'azione è una schermata
   sbagliata** (D-026).

## Da dove ripartire

Il committente giudica il risultato giocandolo e confrontandolo col riferimento. Il
metodo che funziona: **aprire ilnuovogoat.it e misurare**, invece di ricordare.

Cose viste da loro e non ancora fatte:

- **Lo scorrimento automatico durante i sorteggi** del tabellone di coppa (fatto per
  classifica e accoppiamenti, non per il sorteggio che scorre da solo mentre esce).
- **Il caricamento di un database della community** (loro ce l'hanno perché non hanno
  dati; noi abbiamo le rose vere, quindi è una loro debolezza, non una nostra mancanza).
- **Otto lingue.**

Cose nostre che si possono spingere oltre:

- La partita è ancora raccontata a statistiche e cronaca: si può disegnare.
- Il vivaio dura due o tre anni con una scelta l'anno: può avere eventi suoi.
- Il Mondiale e le coppe hanno il tabellone ma non un racconto.

## Le due cose che il committente ha chiesto e che non vanno dimenticate

1. **Rose vere a ogni costo**, rischio licenze accettato e dichiarato in un avviso
   all'apertura. Il motore resta pronto a cambiare database senza toccare il gioco:
   è l'interfaccia `WorldSource`, ed è l'assicurazione costruita apposta.
2. **Non fermarsi a chiedere.** Lavorare, verificare, pubblicare, e riferire cosa si è
   trovato — non chiedere il permesso a ogni passo.

## Un avvertimento pratico

La cartella sta sotto `~/Documents`, che sul Mac è sincronizzata. Una volta ha prodotto
**99 copie di conflitto** (`Carriera 2.tsx`, `next.config 2.ts`…) che sono finite in
cronologia con un `git add -A`. Il `.gitignore` ora le esclude, ma se ricompaiono la
causa è quella.
