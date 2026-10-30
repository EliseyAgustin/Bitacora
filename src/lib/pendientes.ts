// Laburín no puede saber si la persona se postuló en el sitio de la empresa: lo que sí sabe es que abrió el enlace.
// Se recuerda esa oferta como «pendiente de confirmar» y, al volver a la aplicación, se le pregunta.
// Se guarda en el navegador de cada persona (localStorage), así sobrevive a una recarga, algo común en el celular.
type Almacen = Pick<Storage, 'getItem' | 'setItem'>;

export interface PendienteDeConfirmar {
  ofertaId: string;
  empresa: string;
  rol: string;
  // Cuándo se abrió el enlace (ms desde 1970).
  desde: number;
  // Si la persona contestó «todavía no», hasta cuándo no se le vuelve a preguntar.
  posponerHasta?: number;
}

// Tiempo mínimo entre abrir el enlace y preguntar: hay que dejarla llegar al sitio y postularse.
export const ESPERA_MINIMA_MS = 3000;
const MAXIMO_PENDIENTES = 5;

const clave = (userId: string) => `laburin:pendientes:${userId}`;

export function listarPendientes(userId: string, almacen: Almacen | null): PendienteDeConfirmar[] {
  if (!almacen) return [];
  try {
    const crudo = almacen.getItem(clave(userId));
    const datos: unknown = crudo ? JSON.parse(crudo) : [];
    if (!Array.isArray(datos)) return [];
    return datos.filter(
      (d): d is PendienteDeConfirmar =>
        typeof d === 'object' && d !== null && typeof d.ofertaId === 'string' && typeof d.empresa === 'string' && typeof d.rol === 'string' && typeof d.desde === 'number'
    );
  } catch {
    return [];
  }
}

function guardar(userId: string, pendientes: PendienteDeConfirmar[], almacen: Almacen | null): void {
  if (!almacen) return;
  try {
    almacen.setItem(clave(userId), JSON.stringify(pendientes.slice(-MAXIMO_PENDIENTES)));
  } catch {
    // sin almacenamiento no se puede recordar: la persona igual puede marcar la postulación a mano
  }
}

export function agregarPendiente(
  userId: string,
  oferta: Pick<PendienteDeConfirmar, 'ofertaId' | 'empresa' | 'rol'>,
  ahora: number,
  almacen: Almacen | null
): void {
  const otros = listarPendientes(userId, almacen).filter((p) => p.ofertaId !== oferta.ofertaId);
  guardar(userId, [...otros, { ...oferta, desde: ahora }], almacen);
}

export function resolverPendiente(userId: string, ofertaId: string, almacen: Almacen | null): void {
  guardar(
    userId,
    listarPendientes(userId, almacen).filter((p) => p.ofertaId !== ofertaId),
    almacen
  );
}

export function posponerPendiente(userId: string, ofertaId: string, hasta: number, almacen: Almacen | null): void {
  guardar(
    userId,
    listarPendientes(userId, almacen).map((p) => (p.ofertaId === ofertaId ? { ...p, posponerHasta: hasta } : p)),
    almacen
  );
}

// La próxima pregunta: la más antigua que ya esperó lo suficiente y no está pospuesta.
export function siguientePregunta(userId: string, ahora: number, almacen: Almacen | null): PendienteDeConfirmar | null {
  return (
    listarPendientes(userId, almacen)
      .filter((p) => ahora - p.desde >= ESPERA_MINIMA_MS && (p.posponerHasta === undefined || p.posponerHasta <= ahora))
      .sort((a, b) => a.desde - b.desde)[0] ?? null
  );
}
