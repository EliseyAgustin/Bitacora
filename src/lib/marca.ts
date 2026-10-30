import datos from './marca.json' with { type: 'json' };

// Única fuente del nombre de la marca y de lo que dice qué hace la aplicación. Se cambian en src/lib/marca.json y se
// actualizan solos la aplicación, los tests y los scripts que generan la documentación (docs/scripts).
//  - nombre: cómo se llama la marca en pantalla y en los textos.
//  - archivo: prefijo de los archivos generados (Memoria, Manual y sus PDF).
//  - etiqueta: complemento del título de la pestaña del navegador.
//  - descripcion: una frase que dice qué hace la aplicación, para el inicio de sesión.
export const MARCA: { nombre: string; archivo: string; etiqueta: string; descripcion: string } = datos;
