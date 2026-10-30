import type { EstadoPostulacion } from '@/types/postulacion';

// Colores de cada etapa de una postulación, de los tokens del sistema de diseño (index.css). Las clases se escriben completas
// (no se arman con texto) para que Tailwind las encuentre. La marca es el punto o la barra; la etiqueta, el fondo suave con su tinta.
export const ETAPA_CLASES: Record<EstadoPostulacion, { punto: string; chip: string }> = {
  por_aplicar: { punto: 'bg-etapa-por-aplicar', chip: 'bg-etapa-por-aplicar-fondo text-etapa-por-aplicar-tinta' },
  aplicado: { punto: 'bg-etapa-aplicado', chip: 'bg-etapa-aplicado-fondo text-etapa-aplicado-tinta' },
  en_proceso: { punto: 'bg-etapa-en-proceso', chip: 'bg-etapa-en-proceso-fondo text-etapa-en-proceso-tinta' },
  entrevista: { punto: 'bg-etapa-entrevista', chip: 'bg-etapa-entrevista-fondo text-etapa-entrevista-tinta' },
  oferta: { punto: 'bg-etapa-oferta', chip: 'bg-etapa-oferta-fondo text-etapa-oferta-tinta' },
  rechazado: { punto: 'bg-etapa-rechazado', chip: 'bg-etapa-rechazado-fondo text-etapa-rechazado-tinta' },
};
