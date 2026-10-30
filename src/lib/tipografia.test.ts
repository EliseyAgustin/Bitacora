import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// La aplicación usa una sola tipografía (Figtree), alojada en el propio proyecto: no se pide nada a Google Fonts
// (más privado, más rápido y permite una política de seguridad más estricta). Estas pruebas cuidan que siga así.
const raiz = path.resolve(import.meta.dirname, '../..');
const leer = (archivo: string) => fs.readFileSync(path.join(raiz, archivo), 'utf8');

describe('tipografía propia', () => {
  const html = leer('index.html');
  const css = leer('src/assets/index.css');
  const main = leer('src/main.tsx');
  const paquete = JSON.parse(leer('package.json')) as { dependencies: Record<string, string> };

  it('index.html no enlaza fuentes de otros sitios y declara el idioma español', () => {
    expect(html).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
    expect(html).not.toMatch(/<link[^>]+rel="stylesheet"[^>]+href="https?:/);
    expect(html).toMatch(/<html[^>]*lang="es"/);
  });

  it('la tipografía se empaqueta con la aplicación (Figtree variable) y se carga al arrancar', () => {
    expect(paquete.dependencies['@fontsource-variable/figtree']).toBeTruthy();
    expect(main).toContain('@fontsource-variable/figtree');
  });

  it('los estilos usan Figtree para el texto y los títulos, sin Inter ni Lexend', () => {
    expect(css).toMatch(/--font-sans:[^;]*Figtree Variable/);
    expect(css).toMatch(/--font-heading:[^;]*Figtree Variable/);
    expect(css).not.toMatch(/Lexend|"Inter"/);
  });

  it('el texto base es de 16 px y las cifras tienen una utilidad tabular', () => {
    expect(css).toMatch(/text-\[16px\]/);
    expect(css).toMatch(/@utility num\s*\{[^}]*tabular-nums/);
  });
});
