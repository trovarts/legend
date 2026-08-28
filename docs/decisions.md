# Decisioni prese durante l'implementazione

Ogni voce dice cosa è cambiato rispetto al piano e perché. Il piano resta il documento
di partenza; qui c'è la realtà.

## D-001 — Soglia minima di sei club per campionato

**Piano:** scartare i campionati con meno di 4 club.
**Realtà:** il dataset EA FC 26 copre alcuni campionati sudamericani e asiatici con
4-5 squadre soltanto. Un campionato da quattro squadre non è giocabile.
**Decisione:** soglia alzata a 6 club (`MIN_CLUBS_PER_LEAGUE` in `scripts/import-world.ts`).
**Effetto:** 36 campionati e 619 club invece di 43 e 650. La spec §10 parlava di 42
campionati: il numero reale dopo il filtro di qualità è 36.

## D-002 — Id dei campionati normalizzati

**Piano:** `leagueIdOf(nome, id)` concatena slug e id grezzo.
**Realtà:** nel CSV `league_id` è scritto come decimale (`31.0`), e produceva id come
`serie-a-31.0` — brutti come URL e fragili.
**Decisione:** l'id numerico viene arrotondato a intero prima di comporre lo slug.
**Effetto:** `serie-a-31`. Test aggiunto in `tests/world/importMapping.test.ts`.

## D-003 — La disambiguazione per id era necessaria

**Verifica sul campo:** esistono due "Serie A" (Italia, 20 club; Ecuador, 5 club) e più
"Super League" e "Primera División" in paesi diversi. Usare il nome come chiave le
avrebbe fuse in un unico campionato con rose miste. La chiave `nome + league_id` risolve.

## D-004 — Il 40% delle carriere fa la riserva, e in Fase 1 va bene così

**Misurato al termine della Fase 1** (3000 carriere): picco mediano 68, p90 78, p99 84,
massimo 87. Solo il 7,6% supera 80 di picco e lo 0,6% supera 85. I minuti medi sono 0,34
e il **40% delle carriere gioca meno del 20% dei minuti**.

**Causa:** in Fase 1 il mercato non esiste. Chi viene generato in un club troppo forte per
lui ci resta vent'anni senza giocare, e senza minuti non cresce (che è la regola giusta).
Non è un difetto del bilanciamento: è il pezzo mancante.

**Decisione:** non toccare i parametri di crescita adesso. Toccarli ora significherebbe
compensare l'assenza del mercato gonfiando la crescita, e in Fase 2 il gioco diventerebbe
troppo generoso.

**Verifica obbligatoria in Fase 2:** dopo i trasferimenti, le carriere da riserva devono
scendere sotto il 15% e almeno l'1% delle carriere deve superare 85 di picco — altrimenti
il gioco non produce leggende, e un simulatore in cui nessuno diventa un fuoriclasse non
ha vetta. Il Lab stampa entrambi i numeri a ogni esecuzione.

## D-005 — I minuti si calcolano sul divario, non sul conteggio

**Bug trovato giocando, non dai test.** Un diciassettenne al Napoli giocava il 2% dei
minuti per sedici stagioni. Alla Carrarese in Serie B: identico, 2%. La carriera era la
stessa ovunque, e la scelta del club — che la spec §3.1 vuole decisiva — non contava nulla.

**Perché i test non l'avevano visto:** erano scritti su rose inventate da 4-5 giocatori,
mentre le rose vere ne hanno 28. Testavano un giocatore già competitivo, mai un ragazzo.

**Causa:** `playingTimeShare` contava *quanti* compagni erano più forti e sottraeva 0,12
per posizione: dopo quattro posizioni la quota si azzerava. In una rosa reale ci sono
4-5 attaccanti per club, quindi qualunque giovane finiva sempre al minimo assoluto.
Un rookie da 64 con davanti gente da 65 veniva trattato come uno da 52 con davanti
Lukaku da 84. E chi non gioca non cresce: trappola senza uscita.

**Correzione:** la quota si calcola sul **divario** dall'ultimo posto da titolare del
reparto. Sopra la soglia sei titolare (0,72 più un piccolo margine); sotto si scende di
0,05 per punto. In più un pavimento dell'8% per chi ha 21 anni o meno, perché i club
fanno esordire i ragazzi in coppa e negli spezzoni.

**Effetto misurato su 3000 carriere:**

| | prima | dopo |
|---|---|---|
| Minuti medi | 0,35 | 0,52 |
| Carriere da riserva perenne | 39,9% | 15,6% |
| Carriere sopra 80 di picco | 7,4% | 12,5% |
| Picco mediano | 68 | 71 |

**Lezione, da applicare al resto del progetto:** ogni sistema del motore va testato sui
dati veri, non su rose costruite a mano. I test su dati inventati verificano la formula;
solo quelli sulle rose reali verificano il gioco. `tests/engine/playingTimeReal.test.ts`
è il modello da seguire.

## D-006 — Fase 2 chiusa: D-004 è risolto

Misurato su 5000 carriere alla fine della Fase 2, con mercato e trasferimenti attivi:

| | Fase 1 | Fase 2 | Obiettivo D-004 |
|---|---|---|---|
| Minuti medi | 0,52 | **0,70** | — |
| Carriere da riserva perenne | 15,6% | **1,5%** | sotto il 15% ✓ |
| Carriere sopra 85 di picco | 0,6% | **1,5%** | almeno l'1% ✓ |
| Club per carriera | 1 | **4,8** | — |

Le due condizioni che la Fase 2 doveva rendere vere sono soddisfatte, e le invarianti
corrispondenti sono ora attive nel Lab: se una regressione futura le rompe, `npm run lab`
fallisce.

**Cosa è servito davvero.** Il mercato da solo non bastava. Il Lab ha mostrato che un
diciassettenne non riceveva **nessuna** offerta, e la causa non era quella che sembrava:
nel dataset non esiste alcun club abbastanza debole perché un ragazzo da OVR 55 giochi
titolare — il più scarso d'Italia ha forza 67,5. La condizione del prestito («scatta se
giocheresti più del 45% dei minuti») era quindi irraggiungibile. Corretta in «scatta se
giochi almeno dieci punti percentuali in più di adesso»: passare dall'8% al 22% è
triplicare il campo, ed è esattamente ciò per cui esiste un prestito. In più la politica
di trasferimento penalizzava i prestiti perché scendono di categoria e hanno cartellino
zero: ora chi non gioca li valuta solo sui minuti.

## D-007 — Trofei: la matematica era giusta, il gioco no

Il primo Lab di Fase 2 diceva che il **90% delle carriere vince un trofeo**. Il campionato
non c'entrava (solo il 2,9% delle stagioni si chiude al primo posto, ed è corretto per un
torneo a venti squadre): era la coppa nazionale, vinta dal 72% delle carriere.

Il calcolo era statisticamente coerente — 6% l'anno per vent'anni fa il 73% — ma per il
gioco è un disastro: un trofeo che vincono quasi tutti non vale niente, e i trofei sono il
cuore del punteggio GOAT. La probabilità è stata riscritta perché anche in coppa comandino
i club forti (esponente al cubo, base bassa): una squadra di metà classifica la vince una
volta ogni quarant'anni, non ogni venti. Le carriere con almeno un trofeo sono scese al 66%.

**Regola che ne esce:** un modello statisticamente corretto può comunque essere sbagliato
per il gioco. Il Lab misura, ma il giudizio su cosa deve essere raro resta una scelta di
design, e va scritta.

## D-008 — Limite noto: si cambia squadra troppo spesso

Il Lab riporta una media di 4,8 club per carriera (realistica) ma un massimo di **21**:
qualcuno cambia squadra ogni singola estate. Manca l'attrito che nella realtà danno i
contratti pluriennali, che in Fase 2 non esistono.

**Non corretto adesso di proposito:** i contratti servono comunque alla Fase 3, dove il
rinnovo è uno dei bivi con posta dichiarata (spec §3.5). Introdurli lì, e non qui con una
pezza nella politica di trasferimento.

## D-009 — Il talento va generato, non sperato

Alla fine della Fase 3 il Lab segnalava che **meno dell'1% delle carriere superava 85 di
picco**: la condizione posta da D-004 era di nuovo violata, perché gli infortuni tolgono
minuti e senza minuti non si cresce.

La prima ipotesi era sbagliata. Il collo di bottiglia non erano gli infortuni ma la
**generazione del giocatore**: `createPlayer` partiva sempre da un overall di ~55 e
affidava tutto al margine di potenziale, con un tetto che rendeva 85 quasi irraggiungibile.

I dati hanno chiarito come funziona la realtà: sui 1999 under 19 del dataset il margine di
potenziale arriva **al massimo a +26** (mediana +15), mentre il potenziale assoluto tocca
95. Vuol dire che i fuoriclasse non hanno un margine enorme — **partono già forti**. Il
modello ora genera il talento in tre fasce (fenomeno, promessa, buon giovane), e la
crescita premia di più chi gioca titolare, perché chi ha talento e campo deve esprimerlo.

Effetto: le carriere sopra 85 di picco sono tornate sopra l'1%, e il picco medio è salito
da 70 a 71,7 in tutti e quattro i ruoli.

## D-010 — Il protagonista è più talentuoso della media, di proposito

Il generatore produce circa il **7% di giovani con potenziale da 85 in su**, contro il
**3,9%** misurato fra gli under 19 di prima divisione nel dataset.

Lo scarto è voluto. Quel 3,9% riguarda ragazzi che sono già stati selezionati per entrare
in una rosa di massima serie; il giocatore dell'utente è il protagonista di una storia, non
un nome preso a caso da una lista. Un gioco in cui il 96% delle partite dice «sei un onesto
mestierante» non è un gioco.

È la stessa lezione di D-007, dall'altro lato: **i dati misurano, il design decide** — e
quando il design si allontana dal dato, lo si scrive invece di nasconderlo in una soglia.

## D-011 — Lo strumento che verifica le scelte mentiva

Il `choices-lab` (spec §6: nessun ramo deve essere quello giusto più del 70% delle volte)
alla prima esecuzione dichiarava **sei bivi dominanti su otto**, uno addirittura al 100%.
Erano quasi tutti falsi.

**Bug 1 — i pareggi contati come vittorie.** Se in una carriera il bivio non si presentava
(per `pace-col-mister` serve aver già litigato col mister), le due varianti forzate erano
identiche e producevano lo stesso punteggio: il confronto assegnava allora la vittoria alla
prima opzione della lista, sempre. Ora si contano solo le carriere in cui il bivio è
davvero comparso, e i pareggi vengono scartati.

**Bug 2 — lo strumento non visitava tutti i rami.** Sugli altri bivi usava `boldPolicy`,
che non sceglie mai un'opzione dal valore atteso negativo: nessuno litigava col mister,
quindi il bivio della riconciliazione non si presentava **mai** in cento carriere. Ora la
politica di contorno **esplora** — sceglie in modo deterministico ma vario — così tutti i
rami vengono percorsi. Un utente vero, del resto, sceglie anche col cuore.

**Esito dopo le correzioni** (200 carriere per bivio, contando solo quelle in cui il bivio
è comparso):

| Bivio | Ripartizione delle vittorie |
|---|---|
| rientro-anticipato | aspetta 52% \| anticipa 39% \| infiltrazioni 8% |
| panchina-lunga | lavora 30% \| parla 38% \| chiedi-cessione 31% |
| rinnovo-o-addio | rinnova 52% \| aspetta-scadenza 48% |
| intervista-dopo-la-sconfitta | difendi 48% \| attacca 30% \| niente 22% |
| pace-col-mister | scusati 55% \| tieni-il-punto 45% |
| fascia-di-capitano | accetta 51% \| rifiuta 49% |
| il-ragazzino | aiutalo 42% \| ignoralo 58% |
| ritorno-a-casa | torna 60% \| resta 40% |

Nessuna strada supera il 60%. Per arrivarci sono serviti veri ribilanciamenti del catalogo:
ogni opzione «prudente» che non offriva nulla perdeva sempre, perché il punteggio GOAT
premia minuti, trofei e valore. Adesso **ogni strada paga in qualche moneta**: tenere il
punto col mister può portare al suo esonero, rifiutare la fascia toglie pressione, restare
ad alto livello vale più soldi che tornare a casa.

**Lezione:** prima di credere a uno strumento di verifica, verificare lo strumento. Un
100% netto non è un risultato, è un sintomo.

## D-012 — I bivi non si ripetono, e i nomi dei club non prendono l'articolo

Due difetti che il Simulation Lab non poteva vedere, perché guarda le medie e non legge
le carriere. Sono saltati fuori stampando una carriera intera:

1. **«Chiedi la cessione» tre anni di fila**, e «Aspetta la scadenza» sei volte in una
   carriera. Ogni bivio era estratto senza memoria di quelli già affrontati: il risultato
   non è una carriera, è un disco rotto. Ora un bivio resta «già visto» per quattro
   stagioni (`DILEMMA_COOLDOWN` in `career.ts`), e il contesto porta con sé
   `recentDilemmaIds`.

2. **«Il Atalanta»**. I testi costruivano preposizioni articolate davanti a nomi di club
   presi dal database: impossibile farlo bene in italiano per 619 nomi di tutto il mondo
   (il Napoli, l'Inter, la Roma, lo Spezia). I testi ora usano il nome del club **come
   etichetta iniziale** — «Atalanta. Il medico parla di dodici partite.» — che è sempre
   corretto e ha anche un buon ritmo da cronaca.

**Lezione:** il Lab misura le distribuzioni, non la leggibilità. Prima di chiudere una
fase bisogna stampare una carriera intera e leggerla come la leggerebbe un giocatore.

## D-013 — L'interfaccia rifatta guardando il concorrente giocare

La prima versione dell'interfaccia era corretta e illeggibile: card grigie, righe di
testo, bottoni in colonna. Funzionava e non coinvolgeva nessuno. Il committente l'ha
detto in tre parole — «troppo statico, poco coinvolgente» — e aveva ragione.

Guardando cinque minuti di gameplay del concorrente si capisce dove sta la differenza,
e non è nei colori:

1. **La stagione è un articolo di giornale.** Testata («NOVANTA MINUTI», «SPORT OGGI»),
   occhiello, titolo in maiuscolo su tre righe, capolettera, colonna laterale «DAL CAMPO»
   con le voci dello spogliatoio. Non una tabella: una prima pagina.
2. **Le scelte sono card grandi affiancate**, con lo stemma della squadra e in fondo un
   badge verde con quello che ci si guadagna (`+3 OVR`). Non bottoni in fila.
3. **Il giocatore è sempre in alto**, in una tessera con età, overall e valore.

Il nostro difetto peggiore però era un altro, e non riguardava l'estetica: **il Rivale
non si vedeva mai**. Il sistema su cui abbiamo puntato di più compariva solo nel verdetto
finale, dopo venti stagioni. Ora sta sotto la tessera a ogni schermata, verde quando sei
avanti e rosso quando ti è davanti, e ricompare nella colonna del giornale a fine anno.

**Come l'abbiamo rifatta:** `Giornale.tsx` costruisce l'articolo dai momenti già prodotti
dal motore (nessuna logica di gioco nell'interfaccia); `Scelte.tsx` dà a preparazione,
bivi e mercato la stessa forma di card con badge; `Tessera.tsx` tiene in alto chi sei
diventato. I titoli non sono mai statistiche travestite: una funzione dedicata titola sui
fatti — `ATALANTA CAMPIONE`, `SI FERMA: 12 PARTITE FUORI`, `UN ANNO A GUARDARE` — e
quando non è successo niente lo ammette (`ANNO DI MESTIERE A LINCOLN CITY`).

**Il peso, misurato allo stesso modo per entrambi:** primo caricamento 186 KB compressi
contro i 1.199 KB del concorrente. Sei volte e mezzo più leggeri, con un'interfaccia più
ricca. `npm run check:bundle` fallisce se superiamo i 240 KB.

**Lezione:** un'interfaccia può passare tutti i test e non essere un gioco. I test dicono
se funziona; solo guardarla dice se qualcuno ha voglia di usarla.

## D-014 — Le scelte diventano scommesse, e la stagione si guarda

Il committente ha detto che eravamo «ancora lontani dal concetto», e ha indicato due cose:
la scommessa nelle scelte e la creazione della carriera. Aveva ragione su entrambe, e la
seconda parte del video del concorrente ha spiegato perché.

**La scommessa.** Il loro gioco mostra ogni opzione così: «Battaglia per la maglia —
`50%` **+3 OVR** · `50%` **−1 OVR**» contro «Lavoro costante — `+2 OVR`, certo». Due badge
affiancati, la quota sopra, verde e rosso. Noi avevamo gli stessi dati — ogni opzione del
motore ha `outcomes` con probabilità ed effetti — e li appiattivamo in una frase di testo.
Ora `Puntata.tsx` traduce gli effetti in badge: sono gli stessi numeri con cui il motore
risolverà la scelta, non un'etichetta scritta a parte. Le opzioni senza rischio dicono
**esito certo** invece di fingere una percentuale.

**La creazione.** Quattro menu a tendina erano un modulo, non un gioco. Ora è un flusso
di schermate con la stessa forma di tutto il resto: nome, ruolo, età, una griglia di
bandiere, la categoria (col bonus difficoltà in chiaro) e le squadre — **con l'overall
vero calcolato dalla rosa reale**: Inter 86, Napoli 83, Milan 82, e l'avvertenza «una
corazzata: giocare qui da ragazzo è quasi impossibile». Qui siamo più forti del
concorrente, che ha club inventati come «Milano Nerazzurri» e «Piemonte Bianconeri».

**E la stagione si guarda.** Dal video mancavano tre pezzi, ora ci sono: la **partita in
diretta** (cronometro, punteggio, statistiche che si muovono, velocità da 0,75× a 8×,
`match.ts`), la **classifica** completa del campionato (`standings.ts`) e il **tabellone
di coppa** (`cup.ts`), più il **resoconto** con l'overall che sale davanti agli occhi
(59 → 60). Nessuno di questi decide niente: mettono in scena un risultato che il motore
ha già stabilito, e restano deterministici come tutto il resto.

## D-015 — Un verdetto su venti carriere non è un verdetto

Aggiungendo cinque bivi nuovi (tredici in tutto), il `choices-lab` ha bocciato
`ritorno-a-casa` al 92%. Ma era comparso in **12 carriere**: su un campione così il
risultato è rumore travestito da misura. Ora lo strumento lo dice — sotto le venti
osservazioni stampa «campione troppo piccolo per giudicare» invece di emettere una
sentenza.

Misurato poi davvero, con 50 osservazioni, il bivio era **realmente** sbilanciato (78%):
le due strade davano quasi la stessa cosa, quindi ne vinceva una per inerzia. È diventato
uno scambio esplicito — tornare a casa dà **+18% di minuti ma −2 di overall**, restare dà
**+1 overall** e meno campo — e su 553 osservazioni sta a 40/60.

**Lezione:** prima di credere a un numero, guarda su quante osservazioni è calcolato. E
prima di ribilanciare, controlla che le due strade offrano davvero cose diverse: se danno
lo stesso, la percentuale non si sposta mai.

## D-016 — La carriera comincia a quattordici anni, non a diciassette

Le schermate del concorrente hanno mostrato cinque cose che non erano estetica ma
struttura di gioco, e che ci mancavano tutte:

1. **Si parte dal vivaio a 14 anni.** Due o tre stagioni lontano dai riflettori in cui
   l'unica decisione è *come* crescere: «Forza il ritmo» (50% +3 OVR, 50% niente),
   «Segui il piano completo» (60% +2), «Proteggi la crescita» (+1 certo). Poi il club
   chiede se è ora di salire in prima squadra. È il momento in cui il giocatore impara
   a scommettere, prima ancora di giocare una partita vera.
2. **L'agente si sceglie all'inizio** e resta per tutta la carriera: stelle, quante
   offerte porta ogni estate, il club più forte a cui arriva, con quanti anni di
   contratto residui riesce a farti partire.
3. **Gli obiettivi del club** («chiudere almeno al 14° posto», «ottavi di coppa»): danno
   uno scopo alla stagione prima che cominci.
4. **La home** con le modalità, la **sfida di oggi** (uguale per tutti, ricavata dalla
   data: «Bomber da 300», «Dalla gavetta») e le carriere salvate.
5. **La tessera** con i punti GOAT sempre in vista, non solo alla fine.

Il vivaio è entrato nel salvataggio come le altre decisioni (`youth`, `agentId`,
`promotedAt`), quindi resta tutto deterministico e condivisibile con un codice.

**Cosa non abbiamo ancora, e si vede:** la mappa del mondo interattiva al posto della
griglia di bandiere, il campo da calcio con i ruoli cliccabili al posto delle quattro
card, l'avatar del giocatore, lo stile di gioco («punta ai gol» / «preferisci gli
assist»), le schede Profilo/Agente/Statistiche/Bacheca e la scorciatoia da tastiera.
Sono tutte cose fattibili: nessuna richiede di toccare il motore.

## D-017 — Identità: mappa, campo, avatar, stile, schede

Chiusi gli ultimi cinque punti di distanza dalle schermate del concorrente. Nessuno
richiedeva di cambiare il motore, tranne uno.

**La mappa del mondo.** I 176 paesi arrivano dal TopoJSON di Natural Earth (pubblico
dominio) e vengono convertiti in path SVG **a build-time** da `scripts/build-map.ts`:
a runtime non c'è nessuna libreria di mappe, solo forme già proiettate. I paesi giocabili
sono accesi, gli altri spenti, e sotto resta l'elenco con le bandiere per chi arriva da
tastiera o da telefono.

**Il campo.** Dodici posizioni (ST, LW, RW, CAM, LM, CM, RM, CDM, LB, CB, RB, GK) disegnate
su un campo, ognuna con la sua descrizione. Il motore continua a ragionare in quattro
famiglie di ruolo: la posizione precisa è per il racconto e per il profilo.

**L'avatar.** Disegnato in SVG con cinque parametri (pelle, capelli, espressione, divisa,
scarpini) e il numero di maglia: nessuna immagine da scaricare, e cambia davanti agli occhi
mentre si sceglie.

**Lo stile di gioco** — l'unico che tocca la simulazione. «Punta ai gol» moltiplica i gol
per 1,35 e taglia gli assist a 0,65; «preferisci gli assist» fa il contrario; «giochi per
vincere» pesa il voto anche su dove chiude la squadra. Un test verifica che nessuno stile
sia gratis: chi guadagna da una parte perde dall'altra.

**Le schede** Profilo · Agente · Carriera · Statistiche · Bacheca, e la **barra
spaziatrice** che manda avanti come in un gioco vero (ignorata quando si sta scrivendo).

**Il peso, e come l'abbiamo tenuto.** La mappa da sola pesava più di tutto il resto e
aveva portato il primo caricamento a 246 KB, oltre il limite. Ora si carica solo quando
serve — cioè al primo passo di una carriera nuova, non a chi riprende una partita: siamo
tornati a **201 KB contro i 1.199 del concorrente**.

## D-018 — Una scommessa senza rivelazione non è una scommessa

Il committente ha notato quello che mancava dopo aver messo le quote sulle scelte: si
puntava, e il gioco tirava dritto. L'esito finiva in una riga della colonna «dal campo»
del giornale, letta dopo, quando l'emozione era passata.

Ora fra la scelta e il resto c'è **il momento della verità**: le facce restano tutte in
campo, lampeggiano per nove decimi di secondo — il tempo di trattenere il fiato — e poi
quella uscita si accende col bollino, le altre si spengono. Il riquadro diventa verde se
è andata bene e rosso se è andata male, e sotto compare cosa è successo davvero.

Vale sia per il vivaio («50% +3 OVR» contro «50% nessuna variazione») sia per i bivi in
prima squadra («50% −15% minuti · rottura col mister»). Le opzioni a esito certo saltano
il sorteggio: non c'è niente da rivelare.

**Come funziona senza sporcare il motore:** la carriera è già decisa nel momento in cui
si sceglie — il replay è deterministico. La rivelazione è solo interfaccia: confronta
l'esito registrato nella stagione con le facce dichiarate dall'opzione, e mostra quale
delle due è uscita. Nessuno stato di gioco in più.

## D-019 — Studiato il concorrente per intero, non a campione

Il committente ha chiesto di studiarlo **bene**. Estratti e catalogati tutti i fotogrammi
dei cinque minuti di gameplay, sono venute fuori cose che a campione non si vedevano:

**Il tema colore segue il club.** Giocare nel Nassr tinge l'interfaccia di giallo, nel
Brianza di blu, nel Genova di rosso. Non è un dettaglio: è quello che fa sentire che hai
cambiato squadra. Da noi lo ricava `temaDelClub` dal nome — nessun marchio di nessuno,
solo parole («ross», «inter», «verd», «gial») e in mancanza di quelle un colore stabile
per hash. Le variabili CSS restano le stesse, cambia il loro valore.

**Le partite non possono finire pari.** Nelle finali si va ai supplementari e poi ai
rigori, con la serie che si ferma appena è matematicamente decisa — anche a metà coppia,
per questo il numero di tiri può essere dispari — e a oltranza se serve. La schermata ora
è la loro: stemmi con badge OVR, punteggio grande con i rigori fra parentesi, barra del
tempo, banner dell'ultimo episodio, statistiche a barre casa/trasferta e la sequenza dal
dischetto (● segnato, ✕ sbagliato).

**Quattro situazioni nuove**, prese dal loro flusso: sala operatoria, lavoro mentale,
intervista di fine stagione, lingua e cultura in un paese nuovo. Diciassette bivi in
tutto, e il `choices-lab` dice che nessuno è dominante.

**I bivi urgenti.** Un test diceva che con un ginocchio rotto solo il 70% delle stagioni
proponeva una decisione sull'infortunio: il sorteggio a pesi lo faceva perdere contro gli
altri bivi. Alzare i pesi non bastava — quando il gioco ne estrae uno solo, può ancora
perdere. Ora un bivio può dichiararsi **urgente**: se le condizioni ci sono, passa davanti.
Un infortunio grave è *la* cosa di quella stagione, non un evento fra tanti.

**Cosa resta da fare**, e lo scrivo perché non vada perso: la schermata celebrativa del
trofeo con l'animazione, i playoff di promozione, il tabellone del Mondiale, la scheda
agente interattiva («dimmi che tipo di opportunità vuoi», con altri agenti che ti cercano)
e le offerte multiple in stile «tre club ti vogliono».

## D-020 — Le ultime cinque cose del riferimento

**La celebrazione del trofeo.** Quando si alza una coppa il gioco si ferma: luce dorata,
trofeo che entra in scena, nome della competizione e club. Dura tre secondi e non serve a
niente — ed è esattamente per questo che serve. La vede il 71% delle carriere.

**I playoff di promozione.** Chi chiude fra il terzo e il sesto posto in una serie minore
se li gioca: due semifinali e una finale, e chi vince sale. Capita nel 25% delle carriere.

**Il Mondiale.** Quando la nazionale va a un torneo si vede il cammino: tre partite di
girone e poi l'eliminazione diretta fino a dove si è arrivati. Nel 44% delle carriere.

**L'agente diventa interattivo.** Nella sua scheda gli si dice che tipo di opportunità
cercare — un campionato preciso, un posto da titolare, il contratto migliore, il club più
forte — e la richiesta orienta davvero le offerte della sessione successiva, tanto più
quanto l'agente è forte. Il suo «tetto» ora conta: sopra quel livello le porte restano
chiuse, e dopo qualche stagione da titolare gli agenti migliori si fanno vivi.

**Le offerte multiple.** Con la richiesta giusta l'agente porta un'offerta in più, e il
mercato mostra tre o quattro club che ti vogliono, ognuno con i minuti attesi in chiaro.

Tutto entra nel salvataggio come le altre decisioni: la carriera resta rigiocabile da un
codice, agente e richieste compresi.

## D-021 — Con quattro divisioni, «trofeo» smette di voler dire una cosa sola

**Quando:** costruita la piramide vera (terza e quarta serie, promozioni e retrocessioni).

**Il fatto:** l'invariante del Lab («i trofei sono troppo facili» sopra il 75% delle
carriere) è saltata appena i club hanno cominciato a salire e scendere davvero. Non
perché il modello fosse cambiato: perché vincere la Quarta Divisione · Girone B è
diventato un trofeo come un altro.

**La decisione:** il Lab misura due cose separate. «Con almeno un trofeo» resta come
termometro generale (soglia 85%), e accanto c'è «trofei di prima fascia» — campionato di
massima serie o coppa continentale — con la soglia severa al 70%. Il titolo in quarta
serie continua a esistere, a comparire in bacheca e a valere nel racconto: semplicemente
non è più la cosa che si sorveglia.

**Perché conta:** la tentazione era abbassare la probabilità delle coppe finché il numero
non tornava sotto il 75%. Sarebbe stato peggiorare il gioco per far tornare una misura
scritta quando il gioco era un'altra cosa. Scomposti i trofei per tipo, i numeri sono
risultati sani (campionati 4,0% delle stagioni, coppe nazionali 4,5%, continentali 2,1%
su tre coppe diverse): a essere invecchiata era la domanda, non il modello.

**Da ricordare:** quando un'invariante salta subito dopo una feature, prima di
ricalibrare il modello chiedersi se la feature ha cambiato il significato di quello che
l'invariante misurava.
