'use client';

import type { Dilemma } from '../engine/types';
import { dataDi, etichettaStagione } from './calendario';
import { Puntata } from './Puntata';
import { Scelta, Scelte } from './Scelte';

/**
 * Un episodio del vivaio: la cosa che succede in quell'anno, e cosa decidi di farne.
 * Stessa forma dei bivi della carriera — la posta è dichiarata — ma il mondo intorno
 * è quello di un ragazzo: niente classifica, niente mercato, solo il campo e la testa.
 */
export function Episodio({
  dilemma,
  age,
  clubName,
  overall,
  onChoose,
}: {
  dilemma: Dilemma;
  age: number;
  clubName: string;
  overall: number;
  onChoose: (optionId: string) => void;
}) {
  return (
    <section className="giornale">
      <header className="testata">
        <span className="testata-nome">VIVAIO</span>
        <span className="testata-data">
          {clubName} · {dataDi('stagione', age)} · {etichettaStagione(age)} · {age} anni · OVR {overall}
        </span>
      </header>

      <span className="occhiello">Succede quest&apos;anno</span>
      <h2 className="titolone">{dilemma.title}</h2>

      <p style={{ marginBottom: '1rem' }}>{dilemma.text}</p>

      <Scelte>
        {dilemma.options.map((option, index) => (
          <Scelta
            key={option.id}
            sigla={String(index + 1)}
            titolo={option.label}
            nota={option.stake}
            etichetta={option.outcomes.length > 1 ? 'una scommessa' : 'esito certo'}
            sicura={option.outcomes.length === 1}
            puntata={<Puntata option={option} />}
            onClick={() => onChoose(option.id)}
          />
        ))}
      </Scelte>
    </section>
  );
}
