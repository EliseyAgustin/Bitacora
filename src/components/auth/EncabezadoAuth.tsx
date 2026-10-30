import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Tono = 'primario' | 'exito' | 'alerta';

const TONOS: Record<Tono, string> = {
  primario: 'bg-capitulo-3 text-capitulo-3-tinta',
  exito: 'bg-success/15 text-success',
  alerta: 'bg-error-container text-on-error-container',
};

interface EncabezadoAuthProps {
  icono: LucideIcon;
  titulo: string;
  tono?: Tono;
  children?: ReactNode;
}

// Cabecera de las pantallas de recuperación: ícono en un círculo, título y una explicación corta.
export function EncabezadoAuth({ icono: Icono, titulo, tono = 'primario', children }: EncabezadoAuthProps) {
  return (
    <div className="flex flex-col items-center text-center gap-2">
      <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', TONOS[tono])} aria-hidden="true">
        <Icono className="w-6 h-6" />
      </div>
      <h1 className="text-xl font-heading font-bold text-on-surface">{titulo}</h1>
      {children && <div className="text-sm text-on-surface-variant flex flex-col gap-2">{children}</div>}
    </div>
  );
}
