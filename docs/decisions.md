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
