// Genera los PDF de la Memoria Técnica y del Manual de Usuario a partir de los .docx, sin Word ni LibreOffice:
// .docx -> HTML (mammoth) -> PDF (Chromium de Playwright).
//
// Es una versión de lectura: el contenido es el mismo que el del .docx, pero el diseño es aproximado (por ejemplo,
// el índice se arma con los títulos y no lleva números de página, y los bloques de código pierden la tipografía
// monoespaciada). El documento de referencia es el .docx.
// Uso: npm run docs:pdf (después de npm run docs:generar)
import { chromium } from '@playwright/test';
import mammoth from 'mammoth';
import fs from 'node:fs';
import path from 'node:path';
import MARCA from '../../src/lib/marca.json' with { type: 'json' };

const RAIZ = path.resolve(import.meta.dirname, '../..');

const DOCUMENTOS = [
  { docx: `${MARCA.archivo}-Memoria-Tecnica.docx`, pdf: `${MARCA.archivo}-Memoria-Tecnica.pdf`, titulo: `${MARCA.nombre} — Memoria Técnica` },
  { docx: `${MARCA.archivo}-Manual-de-Usuario.docx`, pdf: `${MARCA.archivo}-Manual-de-Usuario.pdf`, titulo: `${MARCA.nombre} — Manual de Usuario` },
];

const ESTILOS = `
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10.5pt; line-height: 1.5; color: #1a1a1a; margin: 0; }
  .portada { height: 24cm; display: flex; flex-direction: column; justify-content: center; text-align: center; break-after: page; }
  .portada p { margin: 6px 0; color: #444; text-align: center; }
  .portada p:first-child { font-size: 38pt; font-weight: 700; color: #1e4fd8; margin: 0 0 12px; }
  h1 { font-size: 20pt; color: #1e4fd8; break-before: page; margin: 0 0 14px; }
  h1.indice { break-before: auto; }
  h2 { font-size: 14pt; color: #12172b; margin: 22px 0 8px; break-after: avoid; }
  h3 { font-size: 11.5pt; margin: 16px 0 6px; break-after: avoid; }
  p { margin: 0 0 9px; text-align: left; }
  ul, ol { margin: 0 0 10px; padding-left: 24px; } li { margin-bottom: 4px; }
  ul.toc { list-style: none; padding: 0; } ul.toc li.n1 { font-weight: 700; margin-top: 8px; } ul.toc li.n2 { padding-left: 18px; font-size: 10pt; margin-bottom: 1px; }
  img { display: block; margin: 8px auto 4px; max-width: 100%; max-height: 520px; object-fit: contain; border: 1px solid #ccc; break-inside: avoid; }
  p:has(> img) { break-inside: avoid; break-after: avoid; margin-bottom: 0; }
  p:has(> img) + p { text-align: center; font-size: 8.5pt; color: #555; margin-bottom: 14px; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0 14px; font-size: 9.5pt; }
  td, th { border: 1px solid #c7ccd6; padding: 5px 8px; vertical-align: top; } tr { break-inside: avoid; }
  thead td, thead th { background: #1e4fd8; color: #fff; font-weight: 700; } thead td *, thead th * { color: #fff; }
`;

async function aHtml(archivo, titulo) {
  const { value: cuerpo } = await mammoth.convertToHtml({ path: archivo });

  // El .docx lleva un campo de índice que solo Word completa al abrirlo: acá se arma uno con los títulos.
  const titulos = [...cuerpo.matchAll(/<h([12])[^>]*>(.*?)<\/h\1>/g)].map((m) => ({ nivel: Number(m[1]), texto: m[2].replace(/<[^>]+>/g, '') }));
  const indice = titulos.filter((t) => t.texto !== 'Índice').map((t) => `<li class="n${t.nivel}">${t.texto}</li>`).join('');

  const corte = cuerpo.indexOf('<h1');
  const portada = cuerpo.slice(0, corte);
  const resto = cuerpo
    .slice(corte)
    .replace(/<h1[^>]*>Índice<\/h1>(\s*<p>\s*<\/p>)?/, `<h1 class="indice">Índice</h1><ul class="toc">${indice}</ul>`);

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${titulo}</title><style>${ESTILOS}</style></head><body><div class="portada">${portada}</div>${resto}</body></html>`;
}

const navegador = await chromium.launch();
for (const { docx, pdf, titulo } of DOCUMENTOS) {
  const origen = path.join(RAIZ, docx);
  if (!fs.existsSync(origen)) {
    console.warn(`No existe ${docx}: correr antes npm run docs:generar.`);
    continue;
  }
  const pagina = await navegador.newPage();
  await pagina.setContent(await aHtml(origen, titulo), { waitUntil: 'load' });
  await pagina.pdf({
    path: path.join(RAIZ, pdf),
    format: 'A4',
    margin: { top: '2.2cm', bottom: '2.2cm', left: '2.2cm', right: '2.2cm' },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `<div style="width:100%;font-size:8px;color:#777;text-align:center;font-family:Arial,sans-serif;">${titulo} — página <span class="pageNumber"></span> de <span class="totalPages"></span></div>`,
  });
  await pagina.close();
  console.log('Generado:', pdf);
}
await navegador.close();
