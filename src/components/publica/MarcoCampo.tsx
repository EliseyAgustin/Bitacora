import type { ReactNode } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import logoIcono from '@/assets/logo/laburin-logo-icono.svg';
import { Topo } from './Topo';
import './publica.css';

export type CampoColor = 1 | 2 | 3 | 4;

interface MarcoCampoProps {
  // Qué capítulo de color ocupa el fondo (1 azul, 2 naranja, 3 verde salvia, 4 oscuro).
  campo?: CampoColor;
  // Tarjeta más ancha para las pantallas con más contenido (configuración inicial).
  amplio?: boolean;
  // Frase grande al costado de la tarjeta (escritorio) o encima (celular), y lo que va debajo de ella.
  frase?: string;
  lado?: ReactNode;
  children: ReactNode;
}

// Marco de las pantallas con una tarjeta (recuperar contraseña, nueva contraseña, configuración inicial y "no encontrada"):
// un campo de color a pantalla completa, la marca arriba y la mascota asomando por detrás de la tarjeta.
export function MarcoCampo({ campo = 1, amplio = false, frase, lado, children }: MarcoCampoProps) {
  return (
    <div className="pub pub-marco" data-campo={campo} data-dividido={frase ? '' : undefined}>
      <header className="pub-top">
        <span className="pub-marca">
          <img src={logoIcono} alt="" />
          Laburin
        </span>
        <ThemeToggle />
      </header>

      <div className="pub-marco-cuerpo">
        {frase && (
          <div className="pub-lado">
            <p className="pub-frase">{frase}</p>
            {lado}
          </div>
        )}
        <main className="pub-tarjeta-wrap" data-ancho={amplio ? 'amplio' : undefined}>
          <Topo className="pub-topo-tarjeta" />
          <div className="pub-tarjeta">{children}</div>
        </main>
      </div>
    </div>
  );
}
