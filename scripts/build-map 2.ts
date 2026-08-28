/**
 * Converte la mappa del mondo (TopoJSON di Natural Earth, pubblico dominio) in path SVG
 * già proiettati, salvati come modulo TypeScript.
 *
 * Si fa qui, una volta sola, per non portarsi dietro una libreria di mappe a runtime:
 * il gioco carica solo forme già pronte. Uso: npm run build:map
 */
import { readFileSync, writeFileSync } from 'node:fs';

interface Topology {
  transform: { scale: [number, number]; translate: [number, number] };
  arcs: number[][][];
  objects: { countries: { geometries: Geometry[] } };
}
interface Geometry {
  type: 'Polygon' | 'MultiPolygon';
  arcs: number[][] | number[][][];
  properties?: { name?: string };
}

const AREA_MINIMA = 0.35; // in gradi quadrati: sotto, è un'isola che non si vedrebbe
const LARGHEZZA = 1000;
const ALTEZZA = 500;

const topo = JSON.parse(readFileSync('data/raw/world-110m.json', 'utf8')) as Topology;
const { scale, translate } = topo.transform;

/** Gli archi sono delta-compressi: qui tornano coordinate vere. */
const archi: [number, number][][] = topo.arcs.map((arco) => {
  let x = 0;
  let y = 0;
  return arco.map(([dx, dy]) => {
    x += dx ?? 0;
    y += dy ?? 0;
    return [x * scale[0] + translate[0], y * scale[1] + translate[1]] as [number, number];
  });
});

/** Equirettangolare: semplice, e per un planisfero cliccabile va benissimo. */
function proietta([lon, lat]: [number, number]): [number, number] {
  return [
    Math.round(((lon + 180) / 360) * LARGHEZZA * 10) / 10,
    Math.round(((90 - lat) / 180) * ALTEZZA * 10) / 10,
  ];
}

function anello(indici: number[]): [number, number][] {
  const punti: [number, number][] = [];
  for (const indice of indici) {
    const arco = indice < 0 ? [...archi[~indice]!].reverse() : archi[indice]!;
    punti.push(...(punti.length > 0 ? arco.slice(1) : arco));
  }
  return punti;
}

function area(punti: readonly [number, number][]): number {
  let somma = 0;
  for (let i = 0; i < punti.length; i += 1) {
    const [x1, y1] = punti[i]!;
    const [x2, y2] = punti[(i + 1) % punti.length]!;
    somma += x1 * y2 - x2 * y1;
  }
  return Math.abs(somma / 2);
}

function pathDi(geometry: Geometry): string {
  const poligoni: number[][][] =
    geometry.type === 'Polygon' ? [geometry.arcs as number[][]] : (geometry.arcs as number[][][]);

  const pezzi: string[] = [];
  for (const poligono of poligoni) {
    for (const indici of poligono) {
      const punti = anello(indici);
      if (punti.length < 4 || area(punti) < AREA_MINIMA) continue;
      const proiettati = punti.map(proietta);
      pezzi.push(
        `M${proiettati.map(([x, y]) => `${x} ${y}`).join('L')}Z`,
      );
    }
  }
  return pezzi.join('');
}

const paesi = topo.objects.countries.geometries
  .map((geometry) => ({ name: geometry.properties?.name ?? '', d: pathDi(geometry) }))
  .filter((paese) => paese.name !== '' && paese.d !== '')
  .sort((a, b) => a.name.localeCompare(b.name));

const contenuto = `/* Generato da scripts/build-map.ts — non modificare a mano.
 * Fonte: Natural Earth via world-atlas (pubblico dominio).
 */
export const MAP_WIDTH = ${LARGHEZZA};
export const MAP_HEIGHT = ${ALTEZZA};

export interface CountryPath {
  name: string;
  d: string;
}

export const WORLD_PATHS: readonly CountryPath[] = ${JSON.stringify(paesi)};
`;

writeFileSync('src/ui/worldPaths.ts', contenuto);
console.log(`Mappa generata: ${paesi.length} paesi, ${(contenuto.length / 1024).toFixed(0)} KB`);
