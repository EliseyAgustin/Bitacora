import type { ReactNode } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import logoTexto from '@/assets/logo/laburin-logo-texto.svg';

interface AuthLayoutProps {
  subtitulo?: string;
  // Logo más chico para las pantallas con más contenido (recuperación de contraseña).
  compacto?: boolean;
  children: ReactNode;
}

// Marco común de Login, Registro y recuperación de contraseña: mismo fondo, logo y tarjeta.
export function AuthLayout({ subtitulo, compacto = false, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-margin relative">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute -bottom-40 -right-20 w-120 h-120 rounded-full bg-tertiary/15 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-144 h-144 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <ThemeToggle className="absolute top-6 right-6" />
      <div className="w-full max-w-96 bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm flex flex-col gap-5 relative">
        <div className="flex flex-col items-center text-center">
          <img src={logoTexto} alt="Laburin" className={compacto ? 'h-20 w-auto' : 'h-28 w-auto'} />
          {subtitulo && <p className="text-sm text-on-surface-variant mt-1">{subtitulo}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
