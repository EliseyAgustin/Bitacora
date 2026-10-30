// «Descargar mis datos»: todo lo que la aplicación guarda de una persona, en un archivo que se puede leer y llevar a otro lado.
// Se arma en el navegador con lo que la persona ya puede leer (las reglas de acceso no cambian): nada sale a ningún servicio.
type Fila = Record<string, unknown>;

export interface DatosParaExportar {
  usuario: { email: string; nombre: string; creado: string };
  perfil: Fila | null;
  criterios: Fila[];
  ofertas: Fila[];
  postulaciones: Fila[];
  interacciones: Fila[];
  historial: Fila[];
  mensajes: Fila[];
}

// Identificadores de la cuenta que no le dicen nada a quien lee el archivo: se omiten de cada fila.
const CLAVES_INTERNAS = new Set(['user_id', 'destinatario_id', 'remitente_id']);

function sinClavesInternas(filas: Fila[]): Fila[] {
  return filas.map((f) => Object.fromEntries(Object.entries(f).filter(([k]) => !CLAVES_INTERNAS.has(k))));
}

export function armarExportacion(datos: DatosParaExportar, ahora: Date) {
  return {
    version: 1,
    exportado_el: ahora.toISOString(),
    cuenta: { email: datos.usuario.email, nombre: datos.usuario.nombre, registrada_el: datos.usuario.creado },
    perfil_de_busqueda: datos.perfil ? sinClavesInternas([datos.perfil])[0] : null,
    criterios_de_puntaje: sinClavesInternas(datos.criterios),
    ofertas: sinClavesInternas(datos.ofertas),
    postulaciones: sinClavesInternas(datos.postulaciones),
    interacciones: sinClavesInternas(datos.interacciones),
    historial_de_estados: sinClavesInternas(datos.historial),
    mensajes: sinClavesInternas(datos.mensajes),
  };
}

export function nombreDeArchivo(ahora: Date): string {
  return `laburin-mis-datos-${ahora.toISOString().slice(0, 10)}.json`;
}
