# Agente — un'AI che usa il telefono al posto tuo

App Android: le dai un compito (scritto o a voce), lei guarda lo schermo, tocca,
scorre, scrive e apre app finché non ha finito. Il cervello è Claude (Anthropic).

## Come funziona

1. **Occhi:** con il permesso di Accessibilità fa una foto dello schermo e legge i
   pulsanti visibili.
2. **Cervello:** manda foto + elenco a Claude, che decide la prossima mossa.
3. **Mani:** esegue la mossa (tocco, pressione lunga, trascinamento, scorrimento,
   testo, tasti indietro/home, apri app) e ricomincia.

Un pannellino scuro con **Stop** resta in basso a sinistra mentre lavora.
Prima di pagare, mandare messaggi, cancellare o toccare la sicurezza si ferma e chiede.

## Installazione (tutto dal telefono)

1. Scarica `Agente.apk` da questa cartella su GitHub (pulsante download) e aprilo.
2. Se chiede "installa app sconosciute", consenti al browser.
3. Apri **Agente** → "Attiva l'Agente in Accessibilità".
   Se il permesso è grigio ("impostazione limitata"): Impostazioni → App → Agente →
   ⋮ in alto a destra → **Consenti impostazioni limitate**, poi riprova.
4. Crea la chiave su <https://console.anthropic.com/settings/keys>, carica qualche
   dollaro di credito, incollala nell'app e premi **Salva**.

## Costi

Ogni passo costa circa 1–3 centesimi (Claude Opus 5.5). Il diario mostra la spesa.

## Compilare

```
cd phone-agent
echo "sdk.dir=/percorso/android-sdk" > local.properties
gradle :app:assembleRelease
```
