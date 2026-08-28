# LEGGENDA — Specifica V1

**Data:** 28 agosto 2026
**Stato:** design approvato, in attesa di piano di implementazione
**Tipo:** simulatore di carriera calcistica, browser, single-player, offline

---

## 1. Cos'è

LEGGENDA è un simulatore di carriera calcistica che si gioca gratis nel browser.
L'utente crea un calciatore e ne vive la carriera stagione dopo stagione — dal primo
contratto al ritiro — prendendo le decisioni che contano e lasciando al motore la
simulazione di tutto il resto. Alla fine resta un punteggio e un poster della carriera.

Una carriera completa dura **20-30 minuti**. Non serve account, non serve installare
niente, i salvataggi vivono nel browser.

### Il criterio di successo

La V1 è riuscita se un giocatore che ha già provato Il Nuovo Goat, dopo una carriera
su LEGGENDA, non torna indietro. Concretamente, tre cose devono essere vere:

1. Alla fine della carriera l'utente sa raccontare **una storia**, non elencare numeri.
2. Almeno una decisione presa durante la carriera deve essere stata **difficile**.
3. Il poster finale deve essere qualcosa che l'utente **vuole** mandare a un amico.

---

## 2. Il concorrente

`ilnuovogoat.it` — simulatore di carriera, IT/EN/ES, gratuito, ~1600 squadre in 110
campionati, tre modalità (Classica rapida, Dettagliata immersiva, Leggenda narrativa),
lobby online fino a 10 giocatori, punteggio GOAT normalizzato per ruolo.

### Cosa fanno bene (da non rompere)

- Il loop: crea → stagione → scelte → mercato → ritiro → punteggio. Funziona.
- La normalizzazione del punteggio per ruolo: un portiere non è penalizzato.
- Partire dalle divisioni inferiori vale di più che partire da una big.
- Nessun account per iniziare. Attrito zero.
- Le pagine guida statiche (`/come-si-gioca`, `/punteggio-goat`, `/modalita`,
  `/domande-frequenti`) sono ben scritte e prendono traffico organico.

### Debolezze verificate

Verificate leggendo il sito e ispezionando il bundle pubblico (`Dsm5wUgT.js`), non
il codice sorgente — il bundle è offuscato con string-lookup, la logica non è leggibile.

| # | Debolezza | Evidenza | Come la colpiamo |
|---|---|---|---|
| D1 | Squadre e giocatori **fittizi** | FAQ: «Il gioco arriva con nomi e stemmi propri»; i nomi veri arrivano da database caricati dalla community | Rose reali EA FC 26 già nel gioco |
| D2 | Eventi **senza memoria** | Nel bundle gli eventi hanno `weight`, `slot`, `onlySeasons`, `afterSeasons`: estrazione pesata, nessuno stato persistente | Sistema di Segni: le scelte lasciano tracce che riemergono |
| D3 | Mondo di contorno **statico** | Compagni (`mate`) e club generati per la stagione corrente | Il Rivale: una seconda carriera simulata in parallelo per 15+ anni |
| D4 | Scelte **cieche** | Nessuna esposizione di probabilità o posta in gioco | Rischio dichiarato: la posta è sempre visibile |
| D5 | **3,2 MB** di JS in un bundle unico | `curl` sull'asset: 3.286.152 byte | Caricamento per campionato, ~50 KB per volta |
| D6 | Salvataggio come blob locale | FAQ: tre slot nei dati locali del browser | Salvataggio a seed: slot illimitati, condivisibili, rigiocabili |

**Non copiamo il loro codice.** Il bundle è stato ispezionato per capire il perimetro
del prodotto, non per estrarne logica.

---

## 3. Il gioco

### 3.1 Creazione

L'utente sceglie: nome, nazionalità, ruolo (portiere / difensore / centrocampista /
attaccante), età di partenza (16-19), aspetto minimo (per il poster), numero di maglia.

Poi sceglie **dove cominciare**: nazione → campionato → club. Tutti i club con rose
reali sono disponibili, dalla prima alla quarta divisione dove il dato esiste.

Alla creazione il motore genera:
- Gli attributi iniziali del giocatore, coerenti col ruolo e con la divisione scelta.
- Il **potenziale** (nascosto, mai mostrato come numero).
- Il **Rivale** (§3.4).
- Il seed della carriera.

**Vincolo di design:** partire dal basso deve essere più difficile *e* più remunerativo.
Un club di quarta divisione dà più minuti e meno visibilità; una big dà il contrario.

### 3.2 La stagione, in cinque battute

Ogni stagione segue la stessa struttura. È il ritmo del gioco e non cambia mai.

1. **Estate** — mercato. Le offerte arrivano in funzione di valore, età, rendimento
   dell'ultima stagione e reputazione. Si può rinnovare, accettare, rifiutare tutto.
2. **Preparazione** — una sola scelta: su cosa lavori quest'anno. Quattro assi
   (tecnica, fisico, testa, leadership). L'effetto è lento e cumulativo: è la build.
3. **Stagione simulata** — risolta in un colpo. L'output non è una tabella ma una
   **timeline di momenti**: l'esordio, la doppietta nel derby, la panchina di novembre,
   l'infortunio di marzo, il gol che vale la salvezza.
4. **Bivi** — da 2 a 4 decisioni con posta dichiarata (§3.5), piazzate nei punti giusti
   dell'anno, coerenti con quello che è successo davvero nella simulazione.
5. **Verdetto** — statistiche, premi, come ti vedono da fuori, e **dove sta il Rivale**.

### 3.3 Crescita, declino, ritiro

- L'OVR si muove verso il potenziale con una curva legata all'età: crescita rapida
  fino a 23, lenta fino al picco (26-30 secondo ruolo e fisico), poi declino.
- **I minuti giocati sono la valuta principale.** Chi non gioca non cresce, qualunque
  sia il potenziale. Questo rende la scelta del club una decisione vera e non estetica.
- Gli infortuni gravi lasciano una traccia permanente (§3.5) e possono spostare il picco.
- Il ritiro arriva tra i 32 e i 40 anni in funzione di fisico, infortuni accumulati,
  minuti recenti e offerte ricevute. L'utente può ritirarsi prima, di sua scelta.

### 3.4 Il Rivale — sistema distintivo #1

Alla creazione nasce **un altro talento della stessa età**, ruolo compatibile, in un
altro campionato, con potenziale confrontabile. Non è un numero decorativo: è una
carriera vera, simulata dallo stesso motore, con le stesse regole.

Cosa produce:

- **Una misura.** «24 gol» non significa niente da solo. «24 gol, lui 26» significa tutto.
- **Scontri diretti.** Quando le vostre squadre si incontrano — finale continentale,
  semifinale di Mondiale — la partita pesa il doppio nel punteggio finale e genera
  un momento dedicato nella timeline.
- **Storia senza scrivere storia.** Se vince il Pallone d'Oro al posto tuo, il gioco te
  lo ricorda. Se lo superi a 33 anni dopo dieci stagioni di inseguimento, quella è
  *la* carriera.
- **Costo di sviluppo basso.** È il motore già scritto, eseguito una seconda volta.

Il Rivale compare nel verdetto di fine stagione e nel poster finale.

**Vincolo di bilanciamento:** su un campione di carriere, il Rivale deve chiudere
davanti al giocatore circa la metà delle volte. Se vince quasi sempre è frustrante,
se perde quasi sempre è inutile.

### 3.5 Rischio dichiarato e Segni — sistema distintivo #2

**Rischio dichiarato.** Ogni bivio importante mostra cosa si mette in gioco. Non
sempre in percentuale esatta — a volte «probabile», «rischioso» — ma la posta è
sempre visibile. Esempio:

> **Il ginocchio non tiene.** Il medico dice tre mesi. L'agente dice che se salti
> l'Europeo, salti anche il rinnovo.
> - *Rientra a febbraio* — 70% torni intero, 30% te lo porti dietro per sempre
> - *Aspetta giugno* — perdi la stagione, torni al 100%
> - *Infiltrazioni, gioca l'Europeo* — +reputazione, −4 anni di carriera

**Segni.** Ogni scelta rilevante lascia un segno nello stato della carriera: un flag
con intensità, età e decadimento. I segni sono la memoria del gioco.

Esempi: `ginocchio-fragile`, `sbattuto-la-porta`, `bandiera`, `mercenario`,
`uomo-spogliatoio`, `rissa-col-mister`, `tornato-a-casa`, `promessa-tradita`.

Cosa fanno i segni:
- Modificano le probabilità della simulazione (infortuni, minuti, morale).
- **Filtrano gli eventi futuri**: certi bivi si presentano solo se hai certi segni.
- Cambiano il comportamento dei club: chi ti vuole comprare guarda anche chi sei stato.
- Compaiono nel poster finale come tratti della carriera.

Il segno lasciato alla stagione 3 deve poter cambiare qualcosa alla stagione 12.
Questo è il pezzo che il concorrente non ha e che rende ogni carriera diversa.

### 3.6 Nazionale, trofei, premi

- Convocazioni in funzione di rendimento e reputazione, con la concorrenza reale del
  tuo ruolo nella tua nazionale.
- Tornei internazionali ogni due anni nel calendario del gioco.
- Trofei di club: campionato, coppa nazionale, competizioni continentali.
- Premi individuali: capocannoniere, miglior giocatore del campionato, Pallone d'Oro
  (assegnato confrontando anche il Rivale).

### 3.7 Il punteggio finale

Sette componenti, normalizzate **per famiglia di ruolo** (la scelta giusta del
concorrente, la teniamo):

| Componente | Cosa misura |
|---|---|
| Rendimento | Presenze, minuti, gol, assist, clean sheet, voto medio — volume, non solo picchi |
| Trofei | Pesati sul contributo reale: una medaglia da riserva vale poco |
| Premi individuali | Peso alto, dipendono da te e non dalla squadra |
| Nazionale | Convocazioni, presenze, cammino nei tornei |
| Picco OVR | Quanto sei diventato forte |
| Valore massimo | Come ti ha valutato il mercato nel momento migliore |
| Longevità | Quante stagioni ad alto livello |

**Due componenti in più rispetto a loro:**

| Componente | Cosa misura |
|---|---|
| Confronto col Rivale | Averlo battuto nella carriera, e negli scontri diretti |
| Difficoltà del percorso | Partire dalla quarta serie vale più che partire dal Real Madrid |

### 3.8 Il poster

La schermata finale è un **poster verticale** (formato storia, 1080×1920) generato su
canvas e scaricabile come PNG: nome, ruolo, club della carriera, la timeline delle
stagioni, i tre momenti che l'hanno definita, i segni, il confronto col Rivale, il
punteggio. Fatto per essere screenshottato e mandato in chat.

---

## 4. I dati

### 4.1 Fonti

**Fonte primaria — rose reali.** `players.csv` da
`github.com/ismailoksuz/EAFC26-DataHub` (dati EA FC 26), scaricabile via
`raw.githubusercontent.com` senza account. Verificato il 28/08/2026:

- 18.405 giocatori, 662 club, 42 campionati, 4 livelli di divisione, 160 nazionalità
- Colonne utili: `overall`, `potential`, `value_eur`, `wage_eur`, `age`, `dob`,
  `player_positions`, `league_name`, `league_level`, `club_name`, `nationality_name`,
  `club_contract_valid_until_year`, `preferred_foot`, più ~60 attributi tecnici
- Copia locale in `data/raw/fc26-players.csv` (10 MB)

**Fonte secondaria — ampiezza.** `github.com/openfootball/leagues` (dominio pubblico):
campionati e club veri di aree non coperte dal dataset principale. Per questi club le
rose sono **generate** dal motore, coerenti con paese e livello.

### 4.2 Licenza — rischio dichiarato

Il dataset primario deriva da dati pubblicati da EA. Per un progetto pubblicato e
monetizzato è **zona grigia**: nomi di calciatori reali e valutazioni derivate da un
prodotto commerciale altrui. Il concorrente evita il problema spedendo nomi propri e
lasciando i nomi veri ai file della community.

**Decisione presa dall'utente:** si procede con le rose reali.

**Mitigazione architetturale, obbligatoria:** il motore non accede mai al dataset
direttamente. Tutto passa da un adattatore con un'unica interfaccia (`WorldSource`).
Sostituire il database — con nomi propri, con un file community, con qualunque altra
fonte — deve essere il lavoro di un pomeriggio, non una riscrittura. Questa è la
condizione che rende accettabile il rischio.

### 4.3 Pipeline

Uno script di import (`npm run import:world`) trasforma il CSV grezzo in bundle JSON
per campionato, ottimizzati per il gioco:

```
data/raw/fc26-players.csv  →  public/world/index.json          (~15 KB: nazioni, campionati)
                           →  public/world/leagues/it-1.json   (~50 KB: club + rose)
                           →  public/world/leagues/en-1.json
                           →  ...
```

Il gioco carica `index.json` all'avvio e i singoli campionati su richiesta. Il dato
grezzo non viene mai spedito al browser.

---

## 5. Architettura

Tre strati, ognuno testabile in isolamento.

### 5.1 `engine/` — il motore

TypeScript puro. Nessuna dipendenza da React, DOM, rete, orologio di sistema.

Firma concettuale: `(stato, decisione, rng) → (nuovo stato, eventi)`.

**Determinismo assoluto.** Stesso seed + stessa sequenza di decisioni = stessa identica
carriera, oggi e fra un anno. Nessun `Math.random()`, nessun `Date.now()` dentro il
motore: un generatore pseudocasuale seedato passato esplicitamente.

Moduli previsti: `create` (generazione giocatore e mondo iniziale), `season`
(simulazione stagionale), `growth` (crescita/declino/infortuni), `market`
(offerte, rinnovi, trasferimenti), `events` (bivi, rischio, segni), `rival`,
`national` (nazionale e tornei), `score` (punteggio finale).

È il 70% del lavoro. È anche la nostra difesa: senza motore, il resto è grafica.

### 5.2 `data/` — il mondo

Un'unica interfaccia `WorldSource` con implementazione `Fc26Source`. Il motore chiede
«dammi i club della Serie A», «dammi la rosa del Napoli», e non sa da dove arrivano.

### 5.3 `app/` — l'interfaccia

Next.js in **export statico**, pubblicato su Netlify. Nessun server, nessun database,
nessun account, costo di esercizio zero.

- Le pagine guida (`/come-si-gioca`, `/punteggio-goat`, `/domande-frequenti`) sono
  HTML statico vero, indicizzabile. Il concorrente prende traffico organico da lì.
- Il gioco è un'isola React client-side.
- PWA: installabile, giocabile offline dopo la prima visita.

### 5.4 Il salvataggio a seed

**Non salviamo lo stato della carriera. Salviamo il seed e la lista delle decisioni.**
La carriera si ricostruisce rigiocandola dal motore.

Conseguenze, tutte gratuite:

| Conseguenza | Perché conta |
|---|---|
| Un salvataggio pesa meno di un SMS | Slot illimitati, non tre come loro |
| Una carriera è un codice | Si condivide: incolli, e rivivi esattamente quella carriera |
| Si può tornare a un bivio | «E se avessi detto di no?» → nuovo ramo dalla stagione 7 |
| Classifiche non falsificabili (V2) | Il server rigioca il seed e verifica il punteggio |

Requisito che ne deriva: **il formato del salvataggio è versionato**. Ogni modifica al
motore che cambia l'esito di una simulazione alza la versione, e i salvataggi vecchi
vengono rigiocati con la versione del motore con cui erano nati.

---

## 6. Bilanciamento

Il modo in cui muoiono i simulatori è avere numeri che sembrano giusti e non lo sono.

**Simulation Lab** — comando da terminale (`npm run lab`) che gioca migliaia di
carriere complete e verifica invarianti. Fa parte della verifica prima di ogni
pubblicazione, non è un esperimento.

Invarianti da verificare (elenco iniziale, si estende):

- Nessun OVR fuori dai limiti, nessuna stagione senza club, nessuna età negativa.
- La distribuzione dei gol per ruolo resta plausibile: nessun attaccante da 90 gol.
- I portieri possono vincere il punteggio: le prime 100 carriere per punteggio devono
  contenere tutti e quattro i ruoli.
- Partire dalla quarta divisione: più difficile, ma con punteggio medio finale
  superiore per chi ce la fa.
- Il Rivale chiude davanti al giocatore in circa metà delle carriere simulate.
- La carriera media dura fra 14 e 20 stagioni.
- Nessuna decisione è dominante: nessun ramo di scelta deve essere quello giusto
  più del 70% delle volte.

---

## 7. Test

- **Unit/integration (vitest)** sul motore: ogni modulo, più test di determinismo
  (stesso seed → stesso risultato, sempre).
- **Property test** sulle invarianti di §6, su carriere generate casualmente.
- **E2E (Playwright)**: una carriera intera dal browser, desktop e mobile, fino al
  poster. È il golden path e deve restare verde.
- **Regressione salvataggi**: un archivio di salvataggi noti che devono continuare a
  produrre lo stesso identico esito.

---

## 8. Fuori scope V1

Da non costruire adesso, per nessun motivo:

- Account, login, cloud sync
- Classifiche globali e sfida giornaliera *(V2 — abilitate dal salvataggio a seed)*
- Multiplayer / lobby *(V3)*
- Modalità partita-per-partita
- Traduzioni EN/ES *(V2, ma i testi vanno tenuti separati dal codice fin da subito: la V1 è solo in italiano)*
- Modalità multiple in stile Classica/Dettagliata/Leggenda: la V1 ha **una sola
  esperienza**, bilanciata bene. Tre modalità mediocri valgono meno di una giusta
- Monetizzazione
- Editor di database dalla schermata iniziale

---

## 9. Ordine di costruzione

| Fase | Contenuto | Giocabile |
|---|---|---|
| 1 | Import dati + `WorldSource` + generazione giocatore + crescita/declino/ritiro | Terminale |
| 2 | Stagione simulata, minuti, statistiche, trofei, mercato, nazionale | Terminale |
| 3 | Rivale, bivi con rischio, Segni, punteggio finale | Terminale |
| 4 | Interfaccia: creazione, stagione, timeline, bivi, verdetto, salvataggi | **Sì** |
| 5 | Poster PNG, pagine SEO, PWA, Simulation Lab a regime, rifinitura | **Pubblicabile** |

Alla fine di ogni fase il gioco è verificabile: le fasi 1-3 dal Simulation Lab, le
fasi 4-5 dal browser.

---

## 10. Decisioni aperte

Nessuna che blocchi l'implementazione. Da rivedere prima della pubblicazione:

1. **Nomi reali nella versione pubblica.** Si costruisce con le rose vere. La decisione
   se pubblicare con quelle o con nomi propri si prende prima del lancio, e grazie a
   `WorldSource` non costa niente cambiare idea.
2. **Dominio e nome definitivo.** «LEGGENDA» è il nome di lavoro approvato.
3. **Ampiezza campionati.** 42 campionati con rose vere alla V1; l'estensione con
   openfootball si valuta dopo aver visto quanto pesa il caricamento.
