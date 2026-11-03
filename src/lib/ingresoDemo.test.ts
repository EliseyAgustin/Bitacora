import { describe, expect, it } from 'vitest';
import { codificarIngresoDemo, leerIngresoDemo } from './ingresoDemo';

const cuenta = { email: 'persona+demo@example.com', password: 'wVO8xoyVg77a-Lb9!ñ' };

describe('ingresoDemo', () => {
  it('lee lo que codifica, con símbolos y acentos', () => {
    expect(leerIngresoDemo(`#${codificarIngresoDemo(cuenta)}`)).toEqual(cuenta);
  });

  it('el código no lleva caracteres que haya que escapar en una URL', () => {
    expect(codificarIngresoDemo(cuenta)).toMatch(/^demo=[A-Za-z0-9_-]+$/);
  });

  it('sin parámetro o con un código roto devuelve null y no lanza', () => {
    expect(leerIngresoDemo('')).toBeNull();
    expect(leerIngresoDemo('#otra=1')).toBeNull();
    expect(leerIngresoDemo('#demo=%%%')).toBeNull();
    expect(leerIngresoDemo('#demo=e30')).toBeNull(); // «{}»: sin email ni contraseña
  });
});
