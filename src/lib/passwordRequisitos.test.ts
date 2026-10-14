import { describe, expect, it } from 'vitest';
import { requisitosPassword } from '@/lib/passwordRequisitos';

const estado = (password: string) => Object.fromEntries(requisitosPassword(password).map((r) => [r.id, r.cumplido]));

describe('requisitosPassword', () => {
  it('devuelve siempre los mismos cuatro requisitos, en orden, y solo el largo es obligatorio', () => {
    const r = requisitosPassword('');
    expect(r.map((x) => x.id)).toEqual(['largo', 'mayusculas', 'numero', 'simbolo']);
    expect(r.filter((x) => x.obligatorio).map((x) => x.id)).toEqual(['largo']);
  });

  it('con la contraseña vacía no se cumple ninguno', () => {
    expect(estado('')).toEqual({ largo: false, mayusculas: false, numero: false, simbolo: false });
  });

  it('el largo exige 8 caracteres (el mismo mínimo que la validación)', () => {
    expect(estado('abcdefg').largo).toBe(false);
    expect(estado('abcdefgh').largo).toBe(true);
  });

  it('mayúsculas y minúsculas hacen falta las dos', () => {
    expect(estado('abcdefgh').mayusculas).toBe(false);
    expect(estado('ABCDEFGH').mayusculas).toBe(false);
    expect(estado('abcdEFGH').mayusculas).toBe(true);
  });

  it('reconoce el número y el símbolo', () => {
    expect(estado('abcdefgh').numero).toBe(false);
    expect(estado('abcdefg1').numero).toBe(true);
    expect(estado('abcdefgh').simbolo).toBe(false);
    expect(estado('abcdefg!').simbolo).toBe(true);
  });

  it('una contraseña completa los cumple todos', () => {
    expect(estado('Una-clave-larga-9!')).toEqual({ largo: true, mayusculas: true, numero: true, simbolo: true });
  });

  it('cada requisito trae un texto en español para mostrar', () => {
    for (const r of requisitosPassword('')) expect(r.texto.length, r.id).toBeGreaterThan(5);
    expect(requisitosPassword('')[0].texto).toBe('Al menos 8 caracteres');
  });
});
