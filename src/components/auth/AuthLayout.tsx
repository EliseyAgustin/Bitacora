import type { ReactNode } from 'react';
import { MarcoCampo } from '@/components/publica/MarcoCampo';
import { PasosRecuperacion } from './PasosRecuperacion';

interface AuthLayoutProps {
  subtitulo?: string;
  // Se conserva por compatibilidad: el marco nuevo ya es compacto (la mascota asoma por encima de la tarjeta).
  compacto?: boolean;
  // Frase grande que acompaña a la tarjeta y, si es de recuperación de contraseña, en qué paso de los tres está la persona.
  frase?: string;
  pasos?: 1 | 2 | 3;
  campo?: 1 | 2 | 3 | 4;
  children: ReactNode;
}

// Marco común de recuperación de contraseña y "no encontrada": un campo de color con la mascota y una tarjeta.
export function AuthLayout({ subtitulo, frase, pasos, campo = 1, children }: AuthLayoutProps) {
  return (
    <MarcoCampo campo={campo} frase={frase} lado={pasos ? <PasosRecuperacion actual={pasos} variante="lado" /> : undefined}>
      {subtitulo && <p className="text-base text-on-surface-variant text-center -mb-1">{subtitulo}</p>}
      {children}
    </MarcoCampo>
  );
}
