import { describe, expect, it } from 'vitest';
import { campoDeRuta } from './campos';

describe('campoDeRuta', () => {
  it('cada pantalla del candidato tiene su campo de color', () => {
    expect(campoDeRuta('/ofertas')).toBe(1);
    expect(campoDeRuta('/mis-postulaciones')).toBe(2);
    expect(campoDeRuta('/mi-progreso')).toBe(3);
    expect(campoDeRuta('/mi-perfil')).toBe(1);
    expect(campoDeRuta('/mensajes')).toBe(2);
  });
  it('el administrador usa el campo salvia y sus subpantallas, el azul', () => {
    expect(campoDeRuta('/candidatos')).toBe(3);
    expect(campoDeRuta('/candidatos/abc-123')).toBe(1);
  });
  it('una ruta desconocida usa el azul', () => {
    expect(campoDeRuta('/otra-cosa')).toBe(1);
    expect(campoDeRuta('/')).toBe(1);
  });
});
