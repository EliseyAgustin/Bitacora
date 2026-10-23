// Tipos de demo-dataset.mjs, para que el test (src/lib/demoDataset.test.ts) compile con tipos exactos.
export const NOMBRE_DEMO: string;

export type OfertaDemo = {
  empresa: string;
  rol: string;
  ubicacion: string;
  modalidad: 'remoto' | 'hibrido' | 'presencial';
  stack_tecnologico: string[];
  fuente: string;
  fecha_publicacion: string | null;
  created_at: string;
  puntaje_scoring: number;
};

export interface CriterioDemo {
  nombre: string;
  peso: number;
  tipo_coincidencia: 'exacto' | 'contiene' | 'rango_numerico';
  campo_objetivo: string;
  valor_comparacion: string | null;
  rango_min: number | null;
  rango_max: number | null;
  activo: boolean;
}

export type EstadoDemo = 'por_aplicar' | 'aplicado' | 'en_proceso' | 'entrevista' | 'oferta' | 'rechazado';

export interface InteraccionDemo {
  tipo: 'mail' | 'llamada' | 'entrevista' | 'nota';
  notas: string;
  fecha: string;
}

export interface PostulacionDemo {
  // Posición de la oferta dentro de `ofertas`.
  oferta: number;
  estado: EstadoDemo;
  // Estados por los que pasó después de "por aplicar", en orden; el último es el actual.
  recorrido: EstadoDemo[];
  created_at: string;
  fecha_postulacion: string | null;
  interacciones: InteraccionDemo[];
}

export interface RecordatorioDemo {
  // Posición de la postulación dentro de `postulaciones`.
  postulacion: number;
  estado: 'activo' | 'resuelto';
  dias_inactividad: number;
  fecha_generado: string;
  fecha_resuelto: string | null;
}

export interface MensajeDemo {
  texto: string;
  created_at: string;
  leido: boolean;
}

export interface DatasetDemo {
  perfil: {
    nombre: string;
    rol_buscado: string;
    stack_interes: string[];
    modalidad_preferida: string;
    ubicacion: string;
    seniority: string;
    onboarding_completado: boolean;
    dias_inactividad_recordatorio: number;
    registrado_el: string;
  };
  criterios: CriterioDemo[];
  ofertas: OfertaDemo[];
  postulaciones: PostulacionDemo[];
  recordatorios: RecordatorioDemo[];
  mensajes: MensajeDemo[];
}

export function construirDataset(ahora: Date): DatasetDemo;
export function puntajeDe(oferta: Record<string, unknown>, criterios: CriterioDemo[]): number;
