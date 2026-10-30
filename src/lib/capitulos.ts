import { calcularScoring, desglosarScoring } from '@/services/scoring';
import type { CriterioScoring } from '@/types/criterioScoring';

// Datos de ejemplo de los capítulos de la página de inicio (Login y Registro). Son ficticios, pero el cálculo del puntaje
// usa el mismo motor de scoring que la aplicación: lo que se ve acá es lo que después hace Laburin con las ofertas reales.

export const ETIQUETAS_STACK_EJEMPLO = ['React', 'TypeScript', 'Node.js', 'PostgreSQL'] as const;

// La oferta de ejemplo pide tres de las cuatro tecnologías (PostgreSQL no).
export const OFERTA_EJEMPLO = {
  empresa: 'Mercado Norte',
  rol: 'Frontend Developer',
  ubicacion: 'Buenos Aires, Argentina',
  modalidad: 'remoto' as const,
  stack_tecnologico: ['React', 'TypeScript', 'Node.js'],
};

interface CriterioEjemplo {
  id: string;
  nombre: string;
  peso: number;
  tipo: 'contiene' | 'exacto';
  campo: string;
  valor: string;
  // Las tecnologías dependen de lo que la persona marque; la modalidad y la ubicación son parte de su perfil de ejemplo.
  tecnologia?: string;
}

const CRITERIOS_EJEMPLO: CriterioEjemplo[] = [
  ...ETIQUETAS_STACK_EJEMPLO.map((t) => ({
    id: `stack-${t}`,
    nombre: `Stack: ${t}`,
    peso: 15,
    tipo: 'contiene' as const,
    campo: 'stack_tecnologico',
    valor: t,
    tecnologia: t,
  })),
  { id: 'modalidad', nombre: 'Modalidad: Remoto', peso: 10, tipo: 'exacto', campo: 'modalidad', valor: 'remoto' },
  { id: 'ubicacion', nombre: 'Ubicación: Buenos Aires, Argentina', peso: 5, tipo: 'contiene', campo: 'ubicacion', valor: 'Buenos Aires, Argentina' },
];

function comoCriterio(c: CriterioEjemplo, activo: boolean): CriterioScoring {
  return {
    id: c.id,
    user_id: 'ejemplo',
    nombre: c.nombre,
    peso: c.peso,
    tipo_coincidencia: c.tipo,
    campo_objetivo: c.campo,
    valor_comparacion: c.valor,
    rango_min: null,
    rango_max: null,
    activo,
    created_at: '',
    updated_at: '',
  };
}

export interface FilaPuntaje {
  nombre: string;
  peso: number;
  coincide: boolean;
}

export interface EjemploPuntaje {
  puntaje: number;
  maximo: number;
  banda: 'alto' | 'medio' | 'bajo';
  filas: FilaPuntaje[];
}

// Los mismos cortes que Mi progreso: 75 % del máximo o más es alto, 50 % o más es medio, y el resto, bajo.
export function bandaDePuntaje(puntaje: number, maximo: number): 'alto' | 'medio' | 'bajo' {
  const relativo = maximo > 0 ? puntaje / maximo : 0;
  return relativo >= 0.75 ? 'alto' : relativo >= 0.5 ? 'medio' : 'bajo';
}

export function calcularEjemploPuntaje(tecnologiasMarcadas: ReadonlySet<string>): EjemploPuntaje {
  // Un criterio de tecnología solo está activo si la persona la marcó; los otros dos siempre.
  const criterios = CRITERIOS_EJEMPLO.map((c) => comoCriterio(c, c.tecnologia === undefined || tecnologiasMarcadas.has(c.tecnologia)));
  const oferta = { ...OFERTA_EJEMPLO };
  const desglose = desglosarScoring(oferta, criterios);
  const puntaje = calcularScoring(oferta, criterios);
  const maximo = CRITERIOS_EJEMPLO.reduce((suma, c) => suma + c.peso, 0);

  return {
    puntaje,
    maximo,
    banda: bandaDePuntaje(puntaje, maximo),
    filas: CRITERIOS_EJEMPLO.map((c) => ({
      nombre: c.nombre,
      peso: c.peso,
      coincide: desglose.find((d) => d.id === c.id)?.coincide ?? false,
    })),
  };
}

export const ETAPAS_EJEMPLO = [
  { nombre: 'Por aplicar', clausula: 'Primero guardás la oferta', explicacion: 'La guardaste, todavía no te postulaste.' },
  { nombre: 'Aplicado', clausula: 'Después te postulás en su web', explicacion: 'Ya te postulaste. Anotá la fecha y esperá novedades.' },
  { nombre: 'En proceso', clausula: 'Seguís cada paso del proceso', explicacion: 'Te respondieron y hay novedades para seguir.' },
  { nombre: 'Entrevista', clausula: 'Y llegás a la entrevista', explicacion: 'Tenés una charla agendada: preparala con calma.' },
] as const;

// El embudo de ejemplo del último capítulo (los mismos números de la demostración).
export const EMBUDO_EJEMPLO = [
  { etapa: 'Por aplicar', cantidad: 15 },
  { etapa: 'Aplicado', cantidad: 12 },
  { etapa: 'En proceso', cantidad: 7 },
  { etapa: 'Entrevista', cantidad: 4 },
  { etapa: 'Oferta', cantidad: 1 },
] as const;
