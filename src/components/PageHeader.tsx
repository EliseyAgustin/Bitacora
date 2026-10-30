import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Topo } from '@/components/publica/Topo';
import { campoDeRuta } from '@/lib/campos';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  help: string;
  action?: ReactNode;
}

// Cada clase se escribe completa para que Tailwind la encuentre. Son los mismos campos de color del Login y el Registro.
const CAMPOS = {
  1: 'bg-capitulo-1 text-capitulo-1-tinta [--campo:var(--color-capitulo-1)]',
  2: 'bg-capitulo-2 text-capitulo-2-tinta [--campo:var(--color-capitulo-2)]',
  3: 'bg-capitulo-3 text-capitulo-3-tinta [--campo:var(--color-capitulo-3)]',
} as const;

// Apertura de cada pantalla: un capítulo de color que corre de borde a borde, como los de la página de inicio,
// con el titular grande y la mascota asomando de su pozo sobre el borde inferior.
export function PageHeader({ title, help, action }: PageHeaderProps) {
  const campo = campoDeRuta(useLocation().pathname);

  return (
    <div data-campo={campo} className={cn('hero-campo entrada -mt-6 pt-12 pb-10 flex flex-wrap lg:flex-nowrap items-end justify-between gap-x-10 gap-y-6', CAMPOS[campo])}>
      <div className="min-w-0 flex-1">
        <h1 className="text-[clamp(2.5rem,1.3rem+3.8vw,4.75rem)] leading-[0.98] font-heading font-bold tracking-[-0.035em]">{title}</h1>
        <p className="text-xl leading-snug mt-5 max-w-2xl">{help}</p>
      </div>
      <div className="flex items-end gap-8 shrink-0">
        {action}
        <Topo className="hidden lg:block w-36 -mb-10 shrink-0" />
      </div>
    </div>
  );
}
