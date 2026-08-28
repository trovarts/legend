/**
 * I due modi di vivere una stagione.
 *
 * Si sceglie alla creazione e resta scritto nella carriera, non nel browser: due
 * salvataggi sullo stesso computer possono andare a velocità diverse, e una carriera
 * condivisa arriva com'è stata pensata.
 */
export type ModoPartita = 'classica' | 'dettagliata';

export const MODI_PARTITA: readonly { id: ModoPartita; label: string; occhiello: string; text: string }[] = [
  {
    id: 'dettagliata',
    label: 'Dettagliata',
    occhiello: 'Immersiva',
    text: 'La partita che conta minuto per minuto, i tabelloni passo passo, il Mondiale e la coppa.',
  },
  {
    id: 'classica',
    label: 'Classica',
    occhiello: 'Rapida',
    text: "La stagione in un colpo: classifica, trofei e resoconto subito, senza passare dal campo.",
  },
];

export function modoDi(modo: ModoPartita | undefined): ModoPartita {
  return modo === 'classica' ? 'classica' : 'dettagliata';
}
