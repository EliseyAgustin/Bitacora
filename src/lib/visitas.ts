// Las entradas animadas solo se muestran la primera vez que se abre cada pantalla en la sesión: la segunda vez
// la persona ya sabe dónde está cada cosa y la animación estorba. Se recuerda en sessionStorage (se borra al cerrar la pestaña).
type Almacen = Pick<Storage, 'getItem' | 'setItem'>;

const PREFIJO = 'laburin:visitada:';

// Si el navegador no deja leer o guardar, se devuelve "ya visitada": sin memoria no se puede saber si es la primera vez,
// y repetir la animación en cada navegación sería peor que no mostrarla.
export function yaVisitada(clave: string, almacen: Almacen | null): boolean {
  if (!almacen) return true;
  try {
    return almacen.getItem(PREFIJO + clave) !== null;
  } catch {
    return true;
  }
}

export function marcarVisitada(clave: string, almacen: Almacen | null): void {
  if (!almacen) return;
  try {
    almacen.setItem(PREFIJO + clave, '1');
  } catch {
    // sin almacenamiento, no se recuerda nada
  }
}

export function almacenDeSesion(): Almacen | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}
