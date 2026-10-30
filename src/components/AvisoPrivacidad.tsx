import { ShieldCheck } from 'lucide-react';
import { MARCA } from '@/lib/marca';

export const TEXTO_PRIVACIDAD =
  `Tu nombre y tu perfil de búsqueda (rol, tecnologías, modalidad, ubicación y nivel) los puede ver el equipo de ${MARCA.nombre}. Tus ofertas y postulaciones son solo tuyas.`;

export function AvisoPrivacidad() {
  return (
    <p
      role="note"
      className="flex items-start gap-2 text-xs text-on-surface-variant bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2"
    >
      <ShieldCheck className="w-4 h-4 shrink-0 mt-px text-primary" aria-hidden="true" />
      <span>{TEXTO_PRIVACIDAD}</span>
    </p>
  );
}
