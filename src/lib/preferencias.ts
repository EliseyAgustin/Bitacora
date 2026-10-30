// Preferencias de cada persona sobre los avisos de la aplicación. Se guardan en su navegador (no hay nada que enviar a la base).
type Almacen = Pick<Storage, 'getItem' | 'setItem'>;

export interface Preferencias {
  // El aviso de ritmo de búsqueda (Mis postulaciones y Mi progreso).
  avisoActividad: boolean;
  // La pregunta «¿Ya te postulaste?» al volver de una oferta.
  preguntaPostulacion: boolean;
}

export const PREFERENCIAS_INICIALES: Preferencias = { avisoActividad: true, preguntaPostulacion: true };

export const EVENTO_PREFERENCIAS = 'laburin:preferencias';

const clave = (userId: string, nombre: keyof Preferencias) => `laburin:pref:${nombre}:${userId}`;

export function leerPreferencia(userId: string, nombre: keyof Preferencias, almacen: Almacen | null): boolean {
  try {
    const guardado = almacen?.getItem(clave(userId, nombre));
    return guardado === null || guardado === undefined ? PREFERENCIAS_INICIALES[nombre] : guardado === '1';
  } catch {
    return PREFERENCIAS_INICIALES[nombre];
  }
}

export function guardarPreferencia(userId: string, nombre: keyof Preferencias, valor: boolean, almacen: Almacen | null): void {
  try {
    almacen?.setItem(clave(userId, nombre), valor ? '1' : '0');
  } catch {
    // sin almacenamiento no se puede recordar: la preferencia vale hasta recargar
  }
}
