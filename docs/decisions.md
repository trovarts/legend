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
