// Genera los mails de Supabase a partir de sus plantillas (docs/plantillas-email/*.plantilla.html), poniendo el nombre de la
// marca de src/lib/marca.json. El resultado (recuperar-contrasena.html) es lo que se pega en el panel de Supabase.
// Uso: npm run docs:plantillas
import fs from 'node:fs';
import path from 'node:path';
import MARCA from '../../src/lib/marca.json' with { type: 'json' };

const carpeta = path.resolve(import.meta.dirname, '../plantillas-email');

export function renderizar(plantilla) {
  return plantilla
    .replace(/\r?\n {2}PLANTILLA:[^\r\n]*/, '') // la línea que explica de dónde sale la plantilla no va al mail
    .replaceAll('%%MARCA_INICIAL%%', MARCA.nombre.trim()[0].toUpperCase())
    .replaceAll('%%MARCA%%', MARCA.nombre);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  for (const archivo of fs.readdirSync(carpeta).filter((f) => f.endsWith('.plantilla.html'))) {
    const salida = archivo.replace('.plantilla.html', '.html');
    fs.writeFileSync(path.join(carpeta, salida), renderizar(fs.readFileSync(path.join(carpeta, archivo), 'utf8')));
    console.log('Generado:', salida);
  }
}
