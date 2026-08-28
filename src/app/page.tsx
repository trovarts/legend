import Link from 'next/link';

export default function Home() {
  return (
    <main>
      <h1>LEGGENDA</h1>
      <p className="tenue">
        Crea un calciatore e accompagnalo dal primo contratto al ritiro. Squadre vere,
        decisioni con la posta dichiarata, e un rivale della tua generazione che non ti
        molla per vent&apos;anni.
      </p>
      <Link href="/gioca" className="bottone bottone-forte" style={{ marginTop: '1rem' }}>
        Comincia una carriera
      </Link>
    </main>
  );
}
