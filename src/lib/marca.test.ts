import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MARCA } from './marca';

// El nombre de la marca vive solo en src/lib/marca.json. Este test falla si alguien lo escribe a mano en el código de la
// aplicación, en los tests de navegador o en los scripts de documentación: así cambiarlo es tocar un solo archivo.
// Los comentarios no cuentan, y tampoco el nombre en minúsculas (rutas de archivos, dominio, repositorio y Supabase no cambian).
const RAIZ = path.resolve(import.meta.dirname, '../..');
const CARPETAS = ['src', 'e2e', 'docs/scripts'];
const EXTENSIONES = /\.(ts|tsx|mjs)$/;
const NOMBRE_A_MANO = /Laburin|Laburín/;

function archivos(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'capturas' || e.name === 'node_modules' ? [] : archivos(ruta);
    return EXTENSIONES.test(e.name) && e.name !== 'marca.ts' && e.name !== 'marca.test.ts' ? [ruta] : [];
  });
}

function sinComentarios(codigo: string): string {
  return codigo
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(/\r?\n/) // los archivos pueden tener fin de línea de Windows: sin esto un comentario no se descarta
    .map((l) => l.replace(/(^|\s)\/\/.*$/, '$1'))
    .join('\n');
}

describe('marca', () => {
  it('el nombre está definido y la descripción dice qué hace la aplicación', () => {
    expect(MARCA.nombre.trim().length).toBeGreaterThan(0);
    expect(MARCA.archivo).toMatch(/^[\w-]+$/);
    expect(MARCA.descripcion.length).toBeGreaterThan(20);
  });

  it('el nombre no está escrito a mano en la aplicación, los tests de navegador ni los scripts de documentación', () => {
    const infractores: string[] = [];
    for (const carpeta of CARPETAS) {
      for (const archivo of archivos(path.join(RAIZ, carpeta))) {
        const lineas = sinComentarios(fs.readFileSync(archivo, 'utf8')).split('\n');
        lineas.forEach((l, i) => {
          if (NOMBRE_A_MANO.test(l)) infractores.push(`${path.relative(RAIZ, archivo)}:${i + 1}`);
        });
      }
    }
    expect(infractores).toEqual([]);
  });
});
