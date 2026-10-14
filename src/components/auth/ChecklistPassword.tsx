import { Check, Circle } from 'lucide-react';
import { requisitosPassword } from '@/lib/passwordRequisitos';
import { cn } from '@/lib/utils';

// Lista de requisitos que se tilda en vivo mientras se escribe la contraseña. Solo el largo es obligatorio;
// el resto son recomendaciones para que sea más difícil de adivinar.
export function ChecklistPassword({ password }: { password: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold text-on-surface">Tu contraseña debe tener:</p>
      <ul aria-label="Requisitos de la contraseña" className="flex flex-col gap-1">
        {requisitosPassword(password).map((r) => (
          <li
            key={r.id}
            data-requisito={r.id}
            data-cumplido={r.cumplido}
            className={cn('flex items-center gap-2 text-xs', r.cumplido ? 'text-success' : 'text-on-surface-variant')}
          >
            {r.cumplido ? <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> : <Circle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
            <span>
              {r.texto}
              {!r.obligatorio && <span className="text-on-surface-variant"> (recomendado)</span>}
              <span className="sr-only">{r.cumplido ? ': cumplido' : ': pendiente'}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
