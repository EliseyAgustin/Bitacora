import { describe, expect, it } from 'vitest';
import { contarNoLeidos, MENSAJE_MAX, tituloDelMensaje, validarMensaje } from '@/lib/mensajes';
import { MARCA } from './marca';

describe('validarMensaje', () => {
  it('pide escribir algo cuando está vacío o son solo espacios', () => {
    expect(validarMensaje('')).toBe('Escribí el mensaje antes de enviarlo.');
    expect(validarMensaje('   \n ')).toBe('Escribí el mensaje antes de enviarlo.');
  });
  it('acepta hasta 1000 caracteres y rechaza más', () => {
    expect(MENSAJE_MAX).toBe(1000);
    expect(validarMensaje('a'.repeat(1000))).toBeNull();
    expect(validarMensaje('a'.repeat(1001))).toBe('El mensaje es muy largo: el máximo es de 1000 caracteres.');
  });
  it('cuenta el largo sin los espacios de los extremos (igual que la base)', () => {
    expect(validarMensaje('  ' + 'a'.repeat(1000) + '  ')).toBeNull();
  });
  it('acepta un mensaje normal', () => {
    expect(validarMensaje('Falta tu ubicación exacta.')).toBeNull();
  });
});

describe('contarNoLeidos', () => {
  it('cuenta solo los que no se leyeron', () => {
    expect(contarNoLeidos([{ leido: false }, { leido: true }, { leido: false }])).toBe(2);
  });
  it('sin mensajes es cero', () => {
    expect(contarNoLeidos([])).toBe(0);
  });
});

describe('tituloDelMensaje', () => {
  it('distingue la bienvenida de un mensaje del equipo', () => {
    expect(tituloDelMensaje({ tipo: 'bienvenida' })).toBe(`Bienvenida a ${MARCA.nombre}`);
    expect(tituloDelMensaje({ tipo: 'admin' })).toBe(`Mensaje del equipo de ${MARCA.nombre}`);
  });
});
