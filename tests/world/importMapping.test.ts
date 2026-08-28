import { describe, expect, it } from 'vitest';
import { leagueIdOf, slugify, toLevel, toRole } from '../../src/world/importMapping';

describe('toRole', () => {
  it('mappa il portiere', () => {
    expect(toRole('GK')).toBe('GK');
  });

  it('mappa i difensori', () => {
    for (const p of ['CB', 'LB', 'RB', 'LWB', 'RWB']) {
      expect(toRole(p)).toBe('DEF');
    }
  });

  it('mappa i centrocampisti', () => {
    for (const p of ['CDM', 'CM', 'CAM', 'LM', 'RM']) {
      expect(toRole(p)).toBe('MID');
    }
  });

  it('mappa gli attaccanti', () => {
    for (const p of ['ST', 'CF', 'LW', 'RW']) {
      expect(toRole(p)).toBe('FWD');
    }
  });

  it('usa la prima posizione quando ce ne sono più di una', () => {
    expect(toRole('CM, CAM, RM')).toBe('MID');
    expect(toRole('ST,LW')).toBe('FWD');
  });

  it('tratta gli spazi e il minuscolo', () => {
    expect(toRole('  st ')).toBe('FWD');
  });

  it('su posizione sconosciuta ripiega su MID', () => {
    expect(toRole('XYZ')).toBe('MID');
    expect(toRole('')).toBe('MID');
  });
});

describe('slugify', () => {
  it('minuscolo con trattini', () => {
    expect(slugify('Serie A')).toBe('serie-a');
    expect(slugify('La Liga 2')).toBe('la-liga-2');
  });

  it('toglie gli accenti', () => {
    expect(slugify('Liga Profesional de Fútbol')).toBe('liga-profesional-de-futbol');
    expect(slugify('3. Liga')).toBe('3-liga');
  });

  it('non lascia trattini agli estremi', () => {
    expect(slugify('  Premier League  ')).toBe('premier-league');
  });
});

describe('leagueIdOf', () => {
  it('unisce slug e id numerico, perché i nomi non sono univoci', () => {
    expect(leagueIdOf('Serie A', '31')).toBe('serie-a-31');
    expect(leagueIdOf('Super League', '68')).toBe('super-league-68');
  });

  it('normalizza gli id scritti come decimali dal dataset', () => {
    expect(leagueIdOf('Serie A', '31.0')).toBe('serie-a-31');
  });
});

describe('toLevel', () => {
  it('converte i livelli scritti come decimali', () => {
    expect(toLevel('1.0')).toBe(1);
    expect(toLevel('4.0')).toBe(4);
    expect(toLevel('2')).toBe(2);
  });

  it('su valore mancante ripiega su 1', () => {
    expect(toLevel('')).toBe(1);
  });
});
