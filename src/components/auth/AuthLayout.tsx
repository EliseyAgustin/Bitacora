import type { ReactNode } from 'react';
import { MarcoCampo } from '@/components/publica/MarcoCampo';

interface AuthLayoutProps {
  subtitulo?: string;
  // Se conserva por compatibilidad: el marco nuevo ya es compacto (la mascota asoma por encima de la tarjeta).
  compacto?: boolean;
  children: ReactNode;
}

// Marco común de recuperación de contraseña y "no encontrada": un campo de color con la mascota y una tarjeta.
export function AuthLayout({ subtitulo, children }: AuthLayoutProps) {
  return (
    <MarcoCampo campo={1}>
      {subtitulo && <p className="text-base text-on-surface-variant text-center -mb-1">{subtitulo}</p>}
      {children}
    </MarcoCampo>
  );
}
