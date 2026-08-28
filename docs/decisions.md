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
