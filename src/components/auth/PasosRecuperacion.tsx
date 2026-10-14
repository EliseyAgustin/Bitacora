import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const PASOS = ['Pedí el enlace', 'Revisá tu correo', 'Elegí tu contraseña'];

// Indicador de los tres pasos para recuperar la contraseña: dónde está la persona y cuánto falta.
export function PasosRecuperacion({ actual }: { actual: 1 | 2 | 3 }) {
  return (
    <ol aria-label="Pasos para recuperar tu contraseña" className="flex items-start justify-between gap-1">
      {PASOS.map((texto, i) => {
        const numero = i + 1;
        const hecho = numero < actual;
        const esActual = numero === actual;
        return (
          <li key={texto} aria-current={esActual ? 'step' : undefined} className="flex-1 flex flex-col items-center gap-1 text-center">
            <span
              className={cn(
                'w-7 h-7 rounded-full text-xs font-semibold flex items-center justify-center border',
                hecho && 'bg-primary text-on-primary border-primary',
                esActual && 'bg-primary-container text-on-primary-container border-primary',
                !hecho && !esActual && 'bg-surface text-on-surface-variant border-outline-variant'
              )}
            >
              {hecho ? <Check className="w-4 h-4" aria-hidden="true" /> : numero}
            </span>
            <span className={cn('text-[11px] leading-tight', esActual ? 'font-semibold text-on-surface' : 'text-on-surface-variant')}>
              {texto}
              {hecho && <span className="sr-only"> (hecho)</span>}
              {esActual && <span className="sr-only"> (paso actual)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
