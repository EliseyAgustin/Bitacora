import { MARCA } from '@/lib/marca';

export const MENSAJE_MAX = 1000;

export type TipoMensaje = 'admin' | 'bienvenida';

export interface Mensaje {
  id: string;
  remitente_id: string | null;
  destinatario_id: string;
  tipo: TipoMensaje;
  texto: string;
  leido: boolean;
  created_at: string;
}

// El largo se mide sin los espacios de los extremos, igual que la restricción de la base (btrim).
export function validarMensaje(texto: string): string | null {
  const limpio = texto.trim();
  if (!limpio) return 'Escribí el mensaje antes de enviarlo.';
  if (limpio.length > MENSAJE_MAX) return `El mensaje es muy largo: el máximo es de ${MENSAJE_MAX} caracteres.`;
  return null;
}

export function contarNoLeidos(mensajes: Pick<Mensaje, 'leido'>[]): number {
  return mensajes.filter((m) => !m.leido).length;
}

export function tituloDelMensaje(mensaje: Pick<Mensaje, 'tipo'>): string {
  return mensaje.tipo === 'bienvenida' ? `Bienvenida a ${MARCA.nombre}` : `Mensaje del equipo de ${MARCA.nombre}`;
}
