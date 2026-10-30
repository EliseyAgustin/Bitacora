import type { ReactNode } from 'react';
import { MarcoPanel } from '@/components/publica/MarcoPanel';
import { PasosRecuperacion } from './PasosRecuperacion';

interface AuthLayoutProps {
  // Frase grande que acompaña al formulario y, si es de recuperación de contraseña, en qué paso de los tres está la persona.
  frase: string;
  pasos?: 1 | 2 | 3;
  campo?: 1 | 2;
  children: ReactNode;
}

// Marco común de recuperación de contraseña y «no encontrada»: el mismo esqueleto que el Login (campo de color, frase grande,
// formulario sin tarjeta y la mascota abajo).
export function AuthLayout({ frase, pasos, campo = 1, children }: AuthLayoutProps) {
  return (
    <MarcoPanel campo={campo} frase={frase} lado={pasos ? <PasosRecuperacion actual={pasos} variante="lado" /> : undefined}>
      {children}
    </MarcoPanel>
  );
}
