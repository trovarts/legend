'use client';

import { YOUTH_OPTIONS, type YouthApproach } from '../engine/youth';
import { Scelta, Scelte } from './Scelte';

export function Vivaio({
  year,
  age,
  clubName,
  onChoose,
}: {
  year: number;
  age: number;
  clubName: string;
  onChoose: (approach: YouthApproach) => void;
}) {
  return (
    <section className="giornale">
      <header className="testata">
        <span className="testata-nome">VIVAIO</span>
        <span className="testata-data">pre-stagione · {age} anni</span>
      </header>
      <h2 className="titolone">{year === 1 ? 'Primo anno nel vivaio' : `${year}° anno nel vivaio`}</h2>
      <p className="sommario">
        Nelle giovanili di {clubName}: scegli come crescere, lontano dai riflettori.
      </p>

      <Scelte>
        {YOUTH_OPTIONS.map((option) => (
          <Scelta
            key={option.id}
            sigla={option.focus.split(' ')[1]?.slice(0, 3).toUpperCase() ?? 'VIV'}
            titolo={option.title}
            sottotitolo={option.approach}
            nota={option.text}
            etichetta={option.outcomes.length > 1 ? 'una scommessa' : 'esito certo'}
            sicura={option.outcomes.length === 1}
            puntata={
              <span className="puntata">
                {option.outcomes.map((outcome) => (
                  <span
                    key={outcome.label}
                    className={`faccia faccia-${outcome.overall > 0 ? 'bene' : 'male'}`}
                  >
                    {option.outcomes.length > 1 && (
                      <b className="faccia-quota">{Math.round(outcome.chance * 100)}%</b>
                    )}
                    <span className="faccia-esito">{outcome.label}</span>
                  </span>
                ))}
              </span>
            }
            onClick={() => onChoose(option.id)}
          />
        ))}
      </Scelte>
    </section>
  );
}

/** Il bivio che chiude il vivaio: si sale o si aspetta ancora un anno. */
export function Promozione({
  age,
  clubName,
  overall,
  onChoose,
}: {
  age: number;
  clubName: string;
  overall: number;
  onChoose: (sali: boolean) => void;
}) {
  return (
    <section className="giornale">
      <header className="testata">
        <span className="testata-nome">VERSO LA PRIMA</span>
        <span className="testata-data">{age} anni · OVR {overall}</span>
      </header>
      <h2 className="titolone">Il salto</h2>
      <p className="sommario">
        {clubName} ti apre le porte della prima squadra. Il campo è più duro, ma è lì che
        cominciano le carriere.
      </p>

      <Scelte>
        <Scelta
          sigla="1ª"
          titolo="Salto in prima squadra"
          sottotitolo="si fa sul serio"
          nota="Comincia la stagione ufficiale: presenze vere, avversari veri, e nessuno che ti aspetta."
          etichetta="una scommessa"
          puntata={
            <span className="puntata">
              <span className="faccia faccia-bene">
                <span className="faccia-esito">carriera vera</span>
              </span>
              <span className="faccia faccia-male">
                <span className="faccia-esito">rischi la panchina</span>
              </span>
            </span>
          }
          onClick={() => onChoose(true)}
        />
        <Scelta
          sigla="VIV"
          titolo="Un altro anno nel vivaio"
          sottotitolo="con calma"
          nota="Ultima possibilità di restare fra i giovani: un anno in più per arrivare pronto."
          etichetta="esito certo"
          sicura
          puntata={
            <span className="puntata">
              <span className="faccia faccia-bene">
                <span className="faccia-esito">cresci al sicuro</span>
              </span>
            </span>
          }
          onClick={() => onChoose(false)}
        />
      </Scelte>
    </section>
  );
}
